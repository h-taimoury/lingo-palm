"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TranslationPopover({ translation, keyboardShortcuts = false }: { translation: string; keyboardShortcuts?: boolean }) {
  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  const shortcutToggle = useRef(false);

  useEffect(() => {
    if (!keyboardShortcuts) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() !== "t") return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || target.closest("input, textarea, select, [role='textbox']")
      )) return;
      event.preventDefault();
      shortcutToggle.current = true;
      setPortalContainer(trigger.current?.closest<HTMLElement>('[role="dialog"]') ?? null);
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardShortcuts]);

  useEffect(() => {
    if (!open) return;
    // Dismiss the translation before the enclosing player dialog handles Escape.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      if (!shortcutToggle.current) trigger.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  return (
    <Popover.Root open={open} triggerId={triggerId} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        shortcutToggle.current = false;
        setPortalContainer(trigger.current?.closest<HTMLElement>('[role="dialog"]') ?? null);
      }
      setOpen(nextOpen);
    }}>
      <Popover.Trigger
        id={triggerId}
        ref={trigger}
        title={`Show or hide Persian translation${keyboardShortcuts ? " (T)" : ""}`}
        aria-keyshortcuts={keyboardShortcuts ? "T" : undefined}
        render={<Button type="button" variant="outline" size="sm" />}
        className="ml-2 align-middle border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary dark:bg-primary/5 dark:hover:bg-primary/10 data-[popup-open]:bg-primary/10"
      >
        <Languages aria-hidden="true" />
        Translation
      </Popover.Trigger>
      {/* Stay inside the dialog and fullscreen element for focus containment. */}
      <Popover.Portal container={portalContainer}>
      <Popover.Positioner positionMethod="fixed" side="bottom" align="end" sideOffset={8} collisionPadding={12} className="z-50">
        <Popover.Popup
          initialFocus={() => !shortcutToggle.current}
          finalFocus={() => !shortcutToggle.current}
          dir="rtl"
          lang="fa"
          aria-label="ترجمهٔ فارسی"
          className="w-max max-w-[min(24rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-border border-r-4 border-r-primary bg-popover p-4 text-popover-foreground shadow-xl outline-none max-h-[var(--available-height)]"
        >
          <Popover.Description className="whitespace-pre-wrap break-words text-xl leading-8 text-zinc-800 dark:text-zinc-200 [overflow-wrap:anywhere]">
            {translation}
          </Popover.Description>
        </Popover.Popup>
      </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
