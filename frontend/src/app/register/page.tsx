import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RegisterForm } from "@/components/auth/RegisterForm"

export default function RegisterPage() {
  return <main className="grid min-h-dvh place-items-center bg-muted/30 px-5 py-10"><Card className="w-full max-w-lg"><CardHeader><CardTitle className="text-2xl">Create your account</CardTitle><CardDescription>Learn exact English meanings from the videos and contexts where they appear.</CardDescription></CardHeader><CardContent><RegisterForm /><p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-medium text-foreground underline underline-offset-4" href="/login">Sign in</Link></p></CardContent></Card></main>
}
