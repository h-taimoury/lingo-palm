"use client";

type SubtitleTokenProps = {
  text: string;
  shortTranslation?: string;
  mappingId: number | null;
  mappingIndex: number;
  onOpenMapping: (mappingId: number) => void;
};

export function SubtitleToken({ text, shortTranslation, mappingId, mappingIndex, onOpenMapping }: SubtitleTokenProps) {
  if (mappingId === null) {
    return <span data-subtitle-text>{text}</span>;
  }

  // Golden-angle spacing separates consecutive mappings without cycling a short palette.
  const hue = (85 + mappingIndex * 137.507764) % 360;

  return (
    <button
      type="button"
      data-player-interactive="true"
      onClick={(event) => {
        event.stopPropagation();
        onOpenMapping(mappingId);
      }}
      dir="ltr"
      className={`relative pointer-events-auto cursor-pointer rounded-sm font-semibold transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${shortTranslation ? "inline-block max-w-full whitespace-normal leading-normal" : ""}`}
      aria-label={`Learn ${text}`}
    >
      <span
        className="box-decoration-clone rounded-sm px-0.5"
        style={{ backgroundColor: `oklch(80% 0.095 ${hue})`, color: `oklch(27% 0.045 ${hue})` }}
      >
        <span data-subtitle-text>{text}</span>
      </span>
      {shortTranslation ? (
        <span
          lang="fa"
          dir="rtl"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-1 text-[0.65em] font-medium leading-tight text-white"
        >
          {shortTranslation}
        </span>
      ) : null}
    </button>
  );
}
