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
import { useTranslations } from "@/lib/i18n/LocaleProvider";

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
  const t = useTranslations();

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
    for (const field of ["translation", "short_translation"] as const) {
      const value = String(form.get(field) ?? "").trim();
      if (value !== (sense?.[field] ?? "").trim()) body[field] = value;
    }
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
            {t("Sense no.")}</Label>
          <Input
            key={sense?.sense_number ?? ""}
            id={`sense-number-${sense?.id ?? "new"}-${entryId}`}
            name="sense_number"
            type="number"
            min={1}
            step={1}
            placeholder="2"
            defaultValue={sense?.sense_number ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`sense-title-${sense?.id ?? "new"}-${entryId}`}>
            {t("Unique title")}</Label>
          <Input
            key={sense?.title ?? ""}
            id={`sense-title-${sense?.id ?? "new"}-${entryId}`}
            name="title"
            placeholder="blade_n_3"
            defaultValue={sense?.title ?? ""}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`sense-def-${sense?.id ?? "new"}-${entryId}`}>
          {t("Definition")}</Label>
        <Textarea
          id={`sense-def-${sense?.id ?? "new"}-${entryId}`}
          name="definition"
          placeholder="a single thin flat piece of grass"
          defaultValue={sense?.definition ?? ""}
          required
          rows={4}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`translation-${sense?.id ?? "new"}-${entryId}`}>{t("Translation")}</Label>
          <Textarea
            id={`translation-${sense?.id ?? "new"}-${entryId}`}
            name="translation"
            lang="fa"
            dir="rtl"
            rows={2}
            defaultValue={sense?.translation ?? ""}
            placeholder="چیز خوبی که انتظارش رو نداشتی"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`short-translation-${sense?.id ?? "new"}-${entryId}`}>{t("Short translation")}</Label>
          <Input
            key={sense?.short_translation ?? ""}
            id={`short-translation-${sense?.id ?? "new"}-${entryId}`}
            name="short_translation"
            lang="fa"
            dir="rtl"
            maxLength={100}
            defaultValue={sense?.short_translation ?? ""}
            placeholder="امتیاز اضافی"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="lex_unit"
          label={t("Lexical unit")}
          placeholder="blade of grass"
          value={sense?.lex_unit}
          id={`${sense?.id ?? "new"}-${entryId}`}
        />
        <Field
          name="geo"
          label={t("Geography")}
          placeholder="British English"
          value={sense?.geo}
          id={`${sense?.id ?? "new"}-${entryId}`}
        />
        <Field
          name="register"
          label={t("Register")}
          placeholder="old-fashioned"
          value={sense?.register}
          id={`${sense?.id ?? "new"}-${entryId}`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`syn-${sense?.id ?? "new"}-${entryId}`}>
            {t("Synonyms")}</Label>
          <Input
            key={sense?.synonyms.join(", ") ?? ""}
            id={`syn-${sense?.id ?? "new"}-${entryId}`}
            name="synonyms"
            placeholder="imitate, take off"
            defaultValue={sense?.synonyms.join(", ") ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`opp-${sense?.id ?? "new"}-${entryId}`}>
            {t("Opposites")}</Label>
          <Input
            key={sense?.opposites.join(", ") ?? ""}
            id={`opp-${sense?.id ?? "new"}-${entryId}`}
            name="opposites"
            placeholder="difficult, hard"
            defaultValue={sense?.opposites.join(", ") ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`examples-${sense?.id ?? "new"}-${entryId}`}>
          {t("Examples")}</Label>
        <Textarea
          id={`examples-${sense?.id ?? "new"}-${entryId}`}
          name="examples"
          defaultValue={sense ? examplesToText(sense.examples) : ""}
          rows={4}
          placeholder={
            "The blade of the knife flashed in the moonlight. || blade of\na razor blade"
          }
        />
        <p className="text-xs text-muted-foreground">
          {t("Enter one example per line. Add “||” followed by a usage note if needed.")}</p>
      </div>
      <Button type="submit" className="w-fit" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {busy ? t("Saving…") : sense ? t("Save sense") : t("Create sense")}
      </Button>
    </form>
  );
}
function Field({
  name,
  label,
  value,
  id,
  placeholder,
}: {
  name: string;
  label: string;
  value?: string | null;
  id: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-${id}`}>{label}</Label>
      <Input key={value ?? ""} id={`${name}-${id}`} name={name} defaultValue={value ?? ""} placeholder={placeholder} />
    </div>
  );
}
