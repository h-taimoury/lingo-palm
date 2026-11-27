import { CorrectEmailForm } from "@/components/auth/CorrectEmailForm";
import { getTranslations } from "@/lib/i18n/server";

export default async function CorrectEmailPage() {
  const t = await getTranslations();

  return <><h1 className="text-2xl font-semibold">{t("Correct your email")}</h1><p className="text-sm text-muted-foreground">{t("For accounts that haven’t verified their email yet. Enter the original address and your registration password.")}</p><CorrectEmailForm /></>;
}
