"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import type {
  CreateSenseRequest,
  Sense,
  SenseExample,
  UpdateSenseRequest,
} from "@/types/api/dictionary";

function list(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[,\n]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}
function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
function nullableInteger(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}
function examplesToText(examples: SenseExample[]) {
  return examples
    .map((item) => (item.usage ? `${item.text} || ${item.usage}` : item.text))
    .join("\n");
}
function parseExamples(value: FormDataEntryValue | null): SenseExample[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [text, ...usageParts] = line.split("||");
      const usage = usageParts.join("||").trim();
      return { text: text.trim(), usage: usage || null };
    });
}

export function SenseForm({
  entryId,
  sense,
  onDone,
}: {
  entryId: number;
  sense?: Sense;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body: CreateSenseRequest = {
      entry_id: entryId,
      sense_number: nullableInteger(form.get("sense_number")),
      title: String(form.get("title") ?? "").trim(),
      definition: String(form.get("definition") ?? "").trim(),
      lex_unit: nullable(form.get("lex_unit")),
      geo: nullable(form.get("geo")),
      register: nullable(form.get("register")),
      synonyms: list(form.get("synonyms")),
      opposites: list(form.get("opposites")),
      examples: parseExamples(form.get("examples")),
    };
    setBusy(true);
    setError(null);
    try {
      if (sense)
        await apiClient.patch<Sense, UpdateSenseRequest>(
          `/api/dictionary/senses/${sense.id}/`,
          body,
        );
      else {
        await apiClient.post<Sense, CreateSenseRequest>(
          "/api/dictionary/senses/",
          body,
        );
        formElement.reset();
      }
      router.refresh();
      onDone?.();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <ApiErrorMessage error={error} />
      <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
        <div className="space-y-2">
          <Label htmlFor={`sense-number-${sense?.id ?? "new"}-${entryId}`}>
            Sense no.
          </Label>
          <Input
            id={`sense-number-${sense?.id ?? "new"}-${entryId}`}
            name="sense_number"
            type="number"
            min={1}
            step={1}
            defaultValue={sense?.sense_number ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`sense-title-${sense?.id ?? "new"}-${entryId}`}>
            Unique title
          </Label>
          <Input
            id={`sense-title-${sense?.id ?? "new"}-${entryId}`}
            name="title"
            defaultValue={sense?.title ?? ""}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`sense-def-${sense?.id ?? "new"}-${entryId}`}>
          Definition
        </Label>
        <Textarea
          id={`sense-def-${sense?.id ?? "new"}-${entryId}`}
          name="definition"
          defaultValue={sense?.definition ?? ""}
          required
          rows={4}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="lex_unit"
          label="Lexical unit"
          value={sense?.lex_unit}
          id={`${sense?.id ?? "new"}-${entryId}`}
        />
        <Field
          name="geo"
          label="Geography"
          value={sense?.geo}
          id={`${sense?.id ?? "new"}-${entryId}`}
        />
        <Field
          name="register"
          label="Register"
          value={sense?.register}
          id={`${sense?.id ?? "new"}-${entryId}`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`syn-${sense?.id ?? "new"}-${entryId}`}>
            Synonyms
          </Label>
          <Input
            id={`syn-${sense?.id ?? "new"}-${entryId}`}
            name="synonyms"
            defaultValue={sense?.synonyms.join(", ") ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`opp-${sense?.id ?? "new"}-${entryId}`}>
            Opposites
          </Label>
          <Input
            id={`opp-${sense?.id ?? "new"}-${entryId}`}
            name="opposites"
            defaultValue={sense?.opposites.join(", ") ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`examples-${sense?.id ?? "new"}-${entryId}`}>
          Examples
        </Label>
        <Textarea
          id={`examples-${sense?.id ?? "new"}-${entryId}`}
          name="examples"
          defaultValue={sense ? examplesToText(sense.examples) : ""}
          rows={4}
          placeholder={
            "One per line. Optional usage: example text || usage note"
          }
        />
        <p className="text-xs text-muted-foreground">
          The “|| usage” format preserves Django’s example usage metadata during
          edits.
        </p>
      </div>
      <Button className="w-fit" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? "Saving…" : sense ? "Save sense" : "Create sense"}
      </Button>
    </form>
  );
}
function Field({
  name,
  label,
  value,
  id,
}: {
  name: string;
  label: string;
  value?: string | null;
  id: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-${id}`}>{label}</Label>
      <Input id={`${name}-${id}`} name={name} defaultValue={value ?? ""} />
    </div>
  );
}
