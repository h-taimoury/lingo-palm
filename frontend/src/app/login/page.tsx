import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return <main className="grid min-h-dvh place-items-center bg-muted/30 px-5 py-10"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-2xl">Welcome back</CardTitle><CardDescription>Sign in to continue learning with LingoPalm.</CardDescription></CardHeader><CardContent><LoginForm /><p className="mt-6 text-center text-sm text-muted-foreground">New here? <Link className="font-medium text-foreground underline underline-offset-4" href="/register">Create an account</Link></p></CardContent></Card></main>
}
