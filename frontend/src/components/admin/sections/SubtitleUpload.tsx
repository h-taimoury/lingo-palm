"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";

export function SubtitleUpload({
  sectionId,
  current,
  mappingCount,
}: {
  sectionId: number;
  current: string;
  mappingCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError(null);
    try {
      await apiClient.patch(`/api/courses/sections/${sectionId}/`, form);
      router.refresh();
      formElement.reset();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Subtitle file</h2>
      <p className="break-all text-xs text-muted-foreground">{current}</p>
      {mappingCount > 0 ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          This section already has {mappingCount} mapping
          {mappingCount === 1 ? "" : "s"}. Replacing the VTT may invalidate
          stored cue/word identities and affect existing mappings.
        </p>
      ) : null}
      <ApiErrorMessage error={error} />
      <div className="space-y-2">
        <Label htmlFor="subtitle_file">Replacement .vtt</Label>
        <Input
          id="subtitle_file"
          disabled={busy}
          required
          type="file"
          name="subtitle_file"
          accept=".vtt,text/vtt"
        />
      </div>
      <Button type="submit" variant="outline" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? "Uploading…" : "Replace VTT"}
      </Button>
    </form>
  );
}
