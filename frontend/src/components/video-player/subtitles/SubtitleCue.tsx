"use client";

import { SubtitleToken } from "@/components/video-player/subtitles/SubtitleToken";
import type { MappedSubtitleCue } from "@/types/subtitles";

type SubtitleCueProps = {
  cue: MappedSubtitleCue;
  onOpenMapping: (mappingId: number) => void;
};

export function SubtitleCue({ cue, onOpenMapping }: SubtitleCueProps) {
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
  return (
    <p className="max-w-[92%] rounded-md bg-black/65 px-3 py-1.5 text-center text-[length:clamp(1.25rem,calc(1rem_+_1cqw),3rem)] font-medium leading-normal text-white shadow-sm">
      {runs.map((run, index) => (
        <span key={run.key}>
          {index > 0 ? " " : null}
          <SubtitleToken
            text={run.text}
            mappingId={run.mappingId}
            mappingIndex={run.mappingId === null ? -1 : mappingIds.indexOf(run.mappingId)}
            onOpenMapping={onOpenMapping}
          />
        </span>
      ))}
    </p>
  );
}
