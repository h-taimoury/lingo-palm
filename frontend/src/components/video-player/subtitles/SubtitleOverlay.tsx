"use client";

import { useMemo } from "react";

import { usePlayerStore } from "@/components/video-player/PlayerProvider";
import { SubtitleCue } from "@/components/video-player/subtitles/SubtitleCue";
import { annotateCuesWithMappings } from "@/lib/subtitles";
import type { WordSenseMapping } from "@/types/api/courses";
import type { SubtitleCue as CanonicalSubtitleCue } from "@/types/subtitles";

type SubtitleOverlayProps = {
  cues: CanonicalSubtitleCue[];
  mappings: WordSenseMapping[];
  onOpenMapping: (mappingId: number) => void;
};

export function SubtitleOverlay({
  cues,
  mappings,
  onOpenMapping,
}: SubtitleOverlayProps) {
  const activeCueIndex = usePlayerStore((state) => state.activeCueIndex);
  const showShortTranslations = usePlayerStore((state) => state.showShortTranslations);

  const mappedCues = useMemo(
    () => annotateCuesWithMappings(cues, mappings),
    [cues, mappings],
  );

  const shortTranslations = useMemo(() => new Map(
    mappings
      .filter((mapping) => mapping.senses.length === 1 && mapping.senses[0].short_translation?.trim())
      .map((mapping) => [mapping.id, mapping.senses[0].short_translation!.trim()]),
  ), [mappings]);

  const cue = mappedCues[activeCueIndex];

  if (!cue) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-20 z-30 flex justify-center [container-type:inline-size]">
      <SubtitleCue
        cue={cue}
        shortTranslations={showShortTranslations ? shortTranslations : undefined}
        onOpenMapping={onOpenMapping}
      />
    </div>
  );
}
