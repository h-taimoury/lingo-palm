"use client";

type SubtitleTokenProps = {
  text: string;
  mappingId: number | null;
  mappingIndex: number;
  onOpenMapping: (mappingId: number) => void;
};

export function SubtitleToken({ text, mappingId, mappingIndex, onOpenMapping }: SubtitleTokenProps) {
  if (mappingId === null) {
    return <span>{text}</span>;
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
      className="pointer-events-auto cursor-pointer rounded-sm font-semibold transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      aria-label={`Learn ${text}`}
    >
      <span
        className="box-decoration-clone rounded-sm px-0.5"
        style={{ backgroundColor: `oklch(80% 0.095 ${hue})`, color: `oklch(27% 0.045 ${hue})` }}
      >
        {text}
      </span>
    </button>
  );
}
