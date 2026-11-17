import Link from "next/link";
import { EmailRequestForm } from "@/components/auth/EmailRequestForm";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string; sent?: string }> }) {
  const { token, email, sent } = await searchParams;
  return <><h1 className="text-2xl font-semibold">Verify your email</h1>{token ? <VerifyEmailForm token={token} /> : <><EmailRequestForm kind="verification" email={email} sent={sent === "1"} /><Link href="/correct-email" className="block text-sm underline underline-offset-4">Entered the wrong email address?</Link></>}</>;
}
