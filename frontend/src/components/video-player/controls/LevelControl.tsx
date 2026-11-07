"use client";

import { useEffect, useId, useRef } from "react";

import { SENSE_LEVELS } from "@/components/video-player/learning/mappingLevels";
import type { SenseLevel } from "@/types/api/dictionary";

type LevelControlProps = {
  selectedLevels: readonly SenseLevel[];
  onChange: (levels: SenseLevel[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LEVEL_LABELS: Record<SenseLevel, string> = {
  A: "Beginner",
  B: "Intermediate",
  C: "Advanced",
};

export function LevelControl({ selectedLevels, onChange, open, onOpenChange }: LevelControlProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const filtering = selectedLevels.length !== SENSE_LEVELS.length;

  useEffect(() => {
    if (!open) return;
    if (document.activeElement === triggerRef.current) {
      rootRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="relative outline-none"
      onClick={(event) => {
        if (event.detail > 0) rootRef.current?.focus({ preventScroll: true });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        data-player-native-keys="true"
        type="button"
        aria-label="Mapping levels"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="Mapping levels"
        onClick={() => onOpenChange(!open)}
        className={`inline-flex h-9 items-center justify-center rounded-md border-b-2 px-2 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${filtering || open ? "border-amber-300" : "border-transparent"}`}
      >
        L
      </button>
      {open ? (
        <div
          id={panelId}
          data-player-native-keys="true"
          role="dialog"
          aria-label="Mapping levels"
          className="absolute bottom-full right-0 mb-3 w-56 rounded-lg border border-white/20 bg-zinc-950/95 p-3 text-sm text-white shadow-xl"
        >
          <p className="mb-2 font-medium">Show levels</p>
          {SENSE_LEVELS.map((level) => (
            <label key={level} className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-white/10">
              <input
                type="checkbox"
                checked={selectedLevels.includes(level)}
                onChange={(event) => onChange(
                  event.target.checked
                    ? [...selectedLevels, level]
                    : selectedLevels.filter((selected) => selected !== level),
                )}
                className="size-4 cursor-pointer accent-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              />
              {LEVEL_LABELS[level]}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
