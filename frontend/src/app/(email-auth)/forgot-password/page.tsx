import Link from "next/link";
import { EmailRequestForm } from "@/components/auth/EmailRequestForm";
import { getTranslations } from "@/lib/i18n/server";

export default async function ForgotPasswordPage() {
  const t = await getTranslations();

  return <><h1 className="text-2xl font-semibold">{t("Forgot password?")}</h1><p className="text-sm text-muted-foreground">{t("Enter your account email to request a password reset link.")}</p><EmailRequestForm kind="reset" /><Link href="/verify-email" className="block text-sm underline underline-offset-4">{t("Need to verify your email first?")}</Link></>;
}
