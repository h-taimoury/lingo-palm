import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AdminVideoPreview } from "@/components/admin/mappings/AdminVideoPreview";
import { annotateCuesWithMappings, buildSubtitleMappingIndex } from "@/lib/subtitles/mappings";
import { parseVtt } from "@/lib/subtitles/parseVtt";
import type { WordSenseMapping } from "@/types/api/courses";
import { SubtitleCue } from "./SubtitleCue";

const state = vi.hoisted(() => ({ currentTime: 1, showShortTranslations: true }));
vi.mock("@/components/video-player/PlayerProvider", () => ({
  PlayerProvider: ({ children }: { children: ReactNode }) => children,
  usePlayerStore: (select: (value: typeof state) => unknown) => select(state),
  usePlayerStoreApi: () => ({}),
}));
vi.mock("@/components/video-player/core/useMediaController", () => ({
  useMediaController: () => ({}),
}));
vi.mock("@/components/video-player/controls/PlayerControls", () => ({
  PlayerControls: () => null,
}));

const { cues } = parseVtt("WEBVTT\n\n00:00:00.000 --> 00:00:05.000\npush them too far\n");
const mapping: WordSenseMapping = {
  id: 7,
  created_at: "2026-11-27T00:00:00Z",
  translation: "translation-marker",
  senses: [],
  // Deliberately reverse storage order: placement must follow subtitle order.
  subtitle_words: [...cues[0].tokens].reverse().filter(token => token.word !== "them").map(token => ({
    id: token.index,
    mapping: 7,
    cue_start_time: cues[0].startTime,
    cue_end_time: cues[0].endTime,
    previous_cue_start_time: null,
    previous_cue_end_time: null,
    next_cue_start_time: null,
    next_cue_end_time: null,
    cue_id: token.cueId, word: token.word, position_in_cue: token.positionInCue,
  })),
};

it.each(["admin", "learner"])("places the %s translation above the first group even when a later group is longer", player => {
  const html = renderToStaticMarkup(player === "admin"
    ? createElement(AdminVideoPreview, {
      source: "lesson.mp4", cues, mappingIndex: buildSubtitleMappingIndex([mapping]),
      selectedKeys: new Set<string>(), activeMappingId: null, onTokenClick: () => {},
    })
    : createElement(SubtitleCue, {
      cue: annotateCuesWithMappings(cues, [mapping])[0],
      shortTranslations: new Map([[mapping.id, mapping.translation!]]), onOpenMapping: () => {},
    }));

  expect(html.split(mapping.translation!)).toHaveLength(2);
  expect(html.indexOf("translation-marker")).toBeGreaterThan(html.indexOf(">push<"));
  expect(html.indexOf("translation-marker")).toBeLessThan(html.indexOf(">them<"));
});
