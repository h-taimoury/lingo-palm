"use client";

import type { MappedSubtitleToken } from "@/types/subtitles";

type SubtitleTokenProps = {
  token: MappedSubtitleToken;
  onOpenMapping: (mappingId: number) => void;
};

export function SubtitleToken({ token, onOpenMapping }: SubtitleTokenProps) {
  if (token.mappingId === null) {
    return <span>{token.word}</span>;
  }

  return (
    <button
      type="button"
      data-player-interactive="true"
      onClick={(event) => {
        event.stopPropagation();
        onOpenMapping(token.mappingId!);
      }}
      className="pointer-events-auto cursor-pointer rounded-sm bg-amber-300/90 px-0.5 font-semibold text-black decoration-black/40 decoration-1 underline-offset-2 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      aria-label={`Learn ${token.word}`}
    >
      {token.word}
    </button>
  );
}
