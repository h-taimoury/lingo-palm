import Link from "next/link";
import { EmailRequestForm } from "@/components/auth/EmailRequestForm";

export default function ForgotPasswordPage() {
  return <><h1 className="text-2xl font-semibold">Forgot password?</h1><p className="text-sm text-muted-foreground">Enter your account email to request a password reset link.</p><EmailRequestForm kind="reset" /><Link href="/verify-email" className="block text-sm underline underline-offset-4">Need to verify your email first?</Link></>;
}
