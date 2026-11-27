"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { EntrySummary } from "@/types/api/dictionary"
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function EntryVariantFields({ variant, id }: { variant: EntrySummary["variant"]; id: string }) {
  const t = useTranslations();

  const [enabled, setEnabled] = useState(Boolean(variant?.word))
  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{t("Variant")}</legend>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="has_variant" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4 accent-primary" />
        {t("This entry has a variant")}</label>
      <p className="text-xs text-muted-foreground">{t("Uncheck to remove the variant when you save the entry.")}</p>
      <div hidden={!enabled} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-variant-word`}>{t("Alternative spelling or form")}</Label>
          <Input id={`${id}-variant-word`} name="variant_word" defaultValue={variant?.word ?? ""} required={enabled} disabled={!enabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-variant-kind`}>{t("Variant type")}</Label>
          <select id={`${id}-variant-kind`} name="variant_kind" defaultValue={variant?.kind ?? "general"} disabled={!enabled} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
            <option value="general">{t("General")}</option>
            <option value="american">{t("American")}</option>
            <option value="british">{t("British")}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-variant-pronunciation`}>{t("Pronunciation (optional)")}</Label>
          <Input id={`${id}-variant-pronunciation`} name="variant_pronunciation" defaultValue={variant?.pronunciation ?? ""} disabled={!enabled} placeholder="/təˈwɔːd $ tɔːrd, twɔːrd/" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-variant-region`}>{t("Regional description (optional)")}</Label>
          <Input id={`${id}-variant-region`} name="variant_region" defaultValue={variant?.region ?? ""} disabled={!enabled} placeholder="especially American English" />
        </div>
      </div>
    </fieldset>
  )
}
