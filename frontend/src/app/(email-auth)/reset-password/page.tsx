import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ uid?: string; token?: string }> }) {
  const { uid, token } = await searchParams;
  return <><h1 className="text-2xl font-semibold">Reset password</h1>{uid && token ? <ResetPasswordForm uid={uid} token={token} /> : <p>This reset link is incomplete. <Link href="/forgot-password" className="underline underline-offset-4">Request a new link</Link>.</p>}</>;
}
