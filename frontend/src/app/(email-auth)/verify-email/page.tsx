import Link from "next/link";
import { EmailRequestForm } from "@/components/auth/EmailRequestForm";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { getTranslations } from "@/lib/i18n/server";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string; sent?: string }> }) {
  const t = await getTranslations();

  const { token, email, sent } = await searchParams;
  return <><h1 className="text-2xl font-semibold">{t("Verify your email")}</h1>{token ? <VerifyEmailForm token={token} /> : <><EmailRequestForm kind="verification" email={email} sent={sent === "1"} /><Link href="/correct-email" className="block text-sm underline underline-offset-4">{t("Entered the wrong email address?")}</Link></>}</>;
}
