"use client";

import { SubtitleToken } from "@/components/video-player/subtitles/SubtitleToken";
import type { MappedSubtitleCue } from "@/types/subtitles";

type SubtitleCueProps = {
  cue: MappedSubtitleCue;
  onOpenMapping: (mappingId: number) => void;
};

export function SubtitleCue({ cue, onOpenMapping }: SubtitleCueProps) {
  return (
    <p className="max-w-[92%] rounded-md bg-black/65 px-3 py-1.5 text-center text-lg font-medium leading-snug text-white shadow-sm sm:text-xl">
      {cue.tokens.map((token, index) => (
        <span key={token.key}>
          {index > 0 ? " " : null}
          <SubtitleToken token={token} onOpenMapping={onOpenMapping} />
        </span>
      ))}
    </p>
  );
}
