"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/errors";
import { useTranslations } from "@/lib/i18n/LocaleProvider";

export function ApiErrorMessage({ error }: { error: unknown }) {
  const t = useTranslations();

  if (!error) return null;
  const message =
    error instanceof Error ? error.message : t("Something went wrong.");
  const fields = error instanceof ApiError ? error.fieldErrors : {};
  return (
    <Alert variant="destructive">
      <AlertTitle>{t("Couldn’t complete that action")}</AlertTitle>
      <AlertDescription>
        <p>{t(message)}</p>
        {Object.keys(fields).length ? (
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {Object.entries(fields).flatMap(([field, messages]) =>
              messages.map((item) => (
                <li key={`${field}-${item}`}>
                  <span className="font-medium">
                    {t(field.replaceAll("_", " "))}:
                  </span>{" "}
                  {t(item)}
                </li>
              )),
            )}
          </ul>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
