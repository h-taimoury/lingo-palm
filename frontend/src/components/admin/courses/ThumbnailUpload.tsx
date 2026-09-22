"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";

export function ThumbnailUpload({
  courseId,
  current,
}: {
  courseId: number;
  current: string | null;
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
      await apiClient.patch(`/api/courses/courses/${courseId}/`, form);
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
      <h2 className="text-lg font-semibold">Thumbnail</h2>
      <ApiErrorMessage error={error} />
      {current ? (
        <div className="relative aspect-video overflow-hidden rounded-lg border">
          <Image
            src={current}
            alt="Current course thumbnail"
            fill
            sizes="(min-width: 1152px) 490px, (min-width: 1024px) calc(50vw - 86px), (min-width: 640px) calc(100vw - 90px), calc(100vw - 74px)"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="grid aspect-video place-items-center rounded-lg border bg-muted text-sm text-muted-foreground">
          No thumbnail
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="thumbnail_file">Choose replacement</Label>
        <Input
          id="thumbnail_file"
          required
          name="thumbnail"
          type="file"
          accept="image/*"
        />
      </div>
      <Button type="submit" variant="outline" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? "Uploading…" : "Replace thumbnail"}
      </Button>
    </form>
  );
}
