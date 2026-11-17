import { Children, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PlayerStore, PlayerStoreState } from "./core/playerStore";
import type { VideoPlayerProps } from "./VideoPlayer";
import type { WordSenseMapping } from "@/types/api/courses";
import { createPlayerStore } from "./core/playerStore";
import { LearningModal } from "./learning/LearningModal";
import { VideoPlayerInner } from "./VideoPlayerInner";

const harness = vi.hoisted(() => ({
  store: null as PlayerStore | null,
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => unknown)[],
  play: vi.fn(),
  post: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) {
      harness.slots[slot] = typeof initial === "function" ? initial() : initial;
    }
    return [harness.slots[slot], (value: unknown) => {
      harness.slots[slot] = typeof value === "function" ? value(harness.slots[slot]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const slot = harness.cursor++;
    return harness.slots[slot] ??= { current: initial };
  },
  useEffect: (effect: () => unknown, deps: unknown[]) => {
    const slot = harness.cursor++;
    const previous = harness.slots[slot] as unknown[] | undefined;
    if (!previous || deps.some((value, index) => !Object.is(value, previous[index]))) {
      harness.slots[slot] = deps;
      harness.effects.push(effect);
    }
  },
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: harness.refresh, push: harness.push }) }));
vi.mock("./PlayerProvider", () => ({
  usePlayerStore: (selector: (state: PlayerStoreState) => unknown) => selector(harness.store!.getState()),
  usePlayerStoreApi: () => harness.store,
}));
vi.mock("./core/useMediaController", () => ({
  useMediaController: () => ({ play: harness.play }),
}));
vi.mock("./core/useKeyboardShortcuts", () => ({ useKeyboardShortcuts: () => {} }));
vi.mock("@/lib/api/client", () => ({ apiClient: { post: harness.post } }));

function elements(node: ReactNode): ReturnType<typeof Children.toArray> {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child)
      ? [child, ...elements(child.props.children)]
      : [],
  );
}

function playerProps(word: string): VideoPlayerProps {
  return {
    source: "lesson.mp4",
    subtitleSource: "/lesson.vtt",
    initialLearnedSenseIds: [],
    mappings: [{
      id: 1,
      senses: [{ id: 17, entry: { word } }],
      subtitle_words: [{ cue_id: 1, word, position_in_cue: 1 }],
    } as WordSenseMapping],
  };
}

function render(props: VideoPlayerProps) {
  harness.cursor = 0;
  const result = VideoPlayerInner(props);
  for (const effect of harness.effects.splice(0)) effect();
  return elements(result);
}

async function loadLesson(props: VideoPlayerProps) {
  render(props);
  await vi.waitFor(() => {
    render(props);
    expect(harness.store!.getState().activeCueIndex).toBe(0);
  });
}

function openCueModal(props: VideoPlayerProps, wasPlaying: boolean) {
  harness.store!.getState().openCueModal(wasPlaying);
  const modal = render(props).find((element) =>
    isValidElement(element) && element.type === LearningModal,
  );
  if (!isValidElement<{
    items: { sense: { id: number } }[];
    onLearn: (id: number) => Promise<void>;
    onClose: () => void;
  }>(modal)) throw new Error("Expected an open vocabulary panel");
  expect(modal.props.items.map(({ sense }) => sense.id)).toEqual([17]);
  return modal.props;
}

beforeEach(() => {
  vi.resetAllMocks();
  harness.store = createPlayerStore();
  harness.slots = [];
  harness.effects = [];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response("WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nbook"),
  ));
});
afterEach(() => vi.unstubAllGlobals());

it("shows the guest's lesson senses and asks them to sign in before saving", async () => {
  const props = { ...playerProps("book"), signInHref: "/login?returnTo=%2Fcourses" };
  await loadLesson(props);
  await openCueModal(props, false).onLearn(17);
  expect(harness.push).toHaveBeenCalledExactlyOnceWith(props.signInHref);
  expect(harness.post).not.toHaveBeenCalled();
});

it("keeps the cue vocabulary button hidden when no mapping matches the subtitle text", async () => {
  const props = playerProps("look");
  await loadLesson(props);

  expect(render(props).some((element) =>
    isValidElement<{ "aria-label"?: string }>(element)
    && element.props["aria-label"] === "Open vocabulary for current subtitle",
  )).toBe(false);
});

it.each([true, false])("closes after saving the last meaning (previously playing: %s)", async (wasPlaying) => {
  const props = playerProps("book");
  await loadLesson(props);
  const modal = openCueModal(props, wasPlaying);
  harness.post.mockResolvedValueOnce([]);

  await modal.onLearn(17);
  render(props);
  render(props);

  expect(harness.post).toHaveBeenCalledExactlyOnceWith(
    "/api/my-vocabulary/vocabulary/bulk-action/",
    { action: "set_learned", sense_ids: [17] },
  );
  expect(harness.store!.getState().modalMode).toBe("closed");
  expect(harness.play).toHaveBeenCalledTimes(wasPlaying ? 1 : 0);
});

it("does not resume twice if the learner closes the panel while saving", async () => {
  const props = playerProps("book");
  await loadLesson(props);
  const modal = openCueModal(props, true);
  let finishSave!: () => void;
  harness.post.mockReturnValueOnce(new Promise<void>((resolve) => { finishSave = resolve; }));

  const pending = modal.onLearn(17);
  modal.onClose();
  expect(harness.play).toHaveBeenCalledTimes(1);
  finishSave();
  await pending;
  render(props);

  expect(harness.store!.getState().modalMode).toBe("closed");
  expect(harness.play).toHaveBeenCalledTimes(1);
});
