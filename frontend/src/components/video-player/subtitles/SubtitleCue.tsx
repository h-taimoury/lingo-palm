"use client";

import { SubtitleToken } from "@/components/video-player/subtitles/SubtitleToken";
import type { MappedSubtitleCue } from "@/types/subtitles";

type SubtitleCueProps = {
  cue: MappedSubtitleCue;
  shortTranslations?: Map<number, string>;
  onOpenMapping: (mappingId: number) => void;
};

export function SubtitleCue({ cue, shortTranslations, onOpenMapping }: SubtitleCueProps) {
  const mappingIds = [...new Set(cue.tokens.flatMap(({ mappingId }) => mappingId === null ? [] : [mappingId]))];
  const runs: { key: string; mappingId: number | null; text: string }[] = [];
  for (const token of cue.tokens) {
    const previous = runs.at(-1);
    if (previous && previous.mappingId === token.mappingId) {
      previous.text += ` ${token.word}`;
    } else {
      runs.push({ key: token.key, mappingId: token.mappingId, text: token.word });
    }
  }
  const firstRuns = new Map<number, (typeof runs)[number]>();
  for (const run of runs) {
    if (run.mappingId === null) continue;
    if (!firstRuns.has(run.mappingId)) firstRuns.set(run.mappingId, run);
  }
  return (
    <p lang="en" dir="ltr" className={`max-w-[92%] rounded-md bg-black/65 px-3 text-center text-[length:clamp(1.25rem,calc(1rem_+_1cqw),3rem)] font-medium text-white shadow-sm ${shortTranslations ? "pt-5 pb-1.5 leading-[2.4]" : "py-1.5 leading-normal"}`}>
      {/* Trim the extra half-leading below the final line (2.4 versus 1.5). */}
      <span className={shortTranslations ? "block -mb-[0.45em]" : undefined}>
      {runs.map((run, index) => (
        <span key={run.key}>
          {index > 0 ? " " : null}
          <SubtitleToken
            text={run.text}
            shortTranslation={run.mappingId !== null && firstRuns.get(run.mappingId) === run ? shortTranslations?.get(run.mappingId) : undefined}
            mappingId={run.mappingId}
            mappingIndex={run.mappingId === null ? -1 : mappingIds.indexOf(run.mappingId)}
            onOpenMapping={onOpenMapping}
          />
        </span>
      ))}
      </span>
    </p>
  );
}
