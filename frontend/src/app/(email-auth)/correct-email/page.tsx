import { CorrectEmailForm } from "@/components/auth/CorrectEmailForm";

export default function CorrectEmailPage() {
  return <><h1 className="text-2xl font-semibold">Correct your email</h1><p className="text-sm text-muted-foreground">For accounts that haven’t verified their email yet. Enter the original address and your registration password.</p><CorrectEmailForm /></>;
}
