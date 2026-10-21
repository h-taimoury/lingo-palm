import json
import re
import html
from decimal import Decimal
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
source = Path(r'C:\Users\Fardin\Desktop\Finding Dory\FindingDory.brrip.2016.1080p.srt')

def read_probe(name):
    return json.loads((root / name).read_text(encoding='utf-8-sig'))

def seconds_ms(value):
    return round(Decimal(value) * 1000)

def parse_stamp(value):
    h, m, s, f = map(int, re.split(r'[:,.]', value))
    return ((h * 60 + m) * 60 + s) * 1000 + f

def stamp(value):
    s, f = divmod(value, 1000)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f'{h:02}:{m:02}:{s:02}.{f:03}'

text = source.read_text(encoding='utf-8-sig')
removed = []
cues = []
for block in re.split(r'\n\s*\n', text.strip()):
    lines = block.splitlines()
    assert lines[0].isdigit()
    start, end = map(parse_stamp, lines[1].split(' --> '))
    assert end > start
    payload = '\n'.join(lines[2:])
    payload = html.unescape(re.sub(r'<[^>]*>', '', payload))
    # Inspected speaker labels; preserve spoken names and clock times.
    payload = re.sub(
        r'(?<!\w)ALL\s*:\s*',
        '', payload, flags=re.IGNORECASE,
    )
    # All parenthetical spans in this particular source were inspected:
    # they are sound, delivery, or action descriptions, not dialogue.
    payload = re.sub(r'\([^)]*\)|\[[^\]]*\]', '', payload)
    payload = payload.replace('\u266a', '').replace('\u266b', '')
    cleaned = []
    for line in payload.splitlines():
        line = re.sub(r'[ \t]+', ' ', line).strip()
        line = re.sub(r'\s+[-\u2013\u2014]$', '', line).strip()
        if line and not re.fullmatch(r'[-\u2013\u2014\s]+', line):
            cleaned.append(line)
    payload = '\n'.join(cleaned)
    assert not re.search(r'[<>\[\]()]', payload)
    if payload:
        cues.append((start, end, int(lines[0]), payload))
    else:
        removed.append(int(lines[0]))
cues.sort(key=lambda c: (c[0], c[2]))
packets = read_probe('probe-original.json')['packets']
covered = set()
reports = []
for i in range(1, 4):
    probe = read_probe(f'probe-section{i}.json')
    first = probe['packets'][0]
    matching = [p for p in packets if p['data_hash'] == first['data_hash']]
    assert matching, f'No matching original packet for section {i}'
    offset = seconds_ms(matching[0]['pts_time']) - seconds_ms(first['pts_time'])
    duration = seconds_ms(probe['format']['duration'])
    kept = []
    for start, end, old_id, payload in cues:
        a, b = max(0, start - offset), min(duration, end - offset)
        if a < b:
            covered.add(old_id)
            kept.append((a, b, payload))
    output = 'WEBVTT\n\n' + '\n\n'.join(
        f'{n}\n{stamp(a)} --> {stamp(b)}\n{payload}'
        for n, (a, b, payload) in enumerate(kept, 1)
    ) + '\n'
    path = root / f'section{i}.vtt'
    path.write_text(output, encoding='utf-8')
    blocks = path.read_text(encoding='utf-8').strip().split('\n\n')[1:]
    assert [int(b.splitlines()[0]) for b in blocks] == list(range(1, len(kept)+1))
    previous = -1
    for block, original in zip(blocks, kept):
        lines = block.splitlines()
        a, b = map(parse_stamp, lines[1].split(' --> '))
        assert 0 <= a < b <= duration and a >= previous
        assert '\n'.join(lines[2:]) == original[2]
        previous = a
    reports.append({'file': path.name, 'cues': len(kept), 'source_minus_local_ms': offset, 'duration_ms': duration})
assert covered == {cue[2] for cue in cues}
report = {'source': str(source), 'retained_source_cues': len(cues), 'removed_source_cues': removed, 'parts': reports,
          'notes': 'Removed font/italic tags, (GASPS), and ALL: speaker label. No credit cues found. Preserved dialogue and meaningful punctuation. Offsets verified using identical video packet hashes. Source subtitle synchronization with the movie itself requires playback verification.'}
(root / 'timing-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
with ZipFile(root / 'Finding-Dory-subtitles.zip', 'w', ZIP_DEFLATED) as archive:
    for i in range(1, 4):
        archive.write(root / f'section{i}.vtt', f'section{i}.vtt')
with ZipFile(root / 'Finding-Dory-subtitles.zip') as archive:
    assert archive.testzip() is None
    for name in archive.namelist():
        assert archive.read(name) == (root / name).read_bytes()
print(json.dumps(report, indent=2))
print('Validated cue numbering, chronological order, timestamp bounds, preserved text, complete source coverage, and ZIP contents.')
