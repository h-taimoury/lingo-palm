import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getTranslations } from "@/lib/i18n/server";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ uid?: string; token?: string }> }) {
  const t = await getTranslations();

  const { uid, token } = await searchParams;
  return <><h1 className="text-2xl font-semibold">{t("Reset password")}</h1>{uid && token ? <ResetPasswordForm uid={uid} token={token} /> : <p>{t("This reset link is incomplete.")} <Link href="/forgot-password" className="underline underline-offset-4">{t("Request a new link")}</Link>.</p>}</>;
}
