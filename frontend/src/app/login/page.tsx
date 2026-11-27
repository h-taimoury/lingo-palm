import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { getTranslations } from "@/lib/i18n/server";

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>  {t("Back to home")}</Link>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">{t("Welcome back")}</CardTitle>
            <CardDescription>
              {t("Sign in to continue learning with LingoPalm.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("New here?")}{" "}
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="/register"
              >
                {t("Create an account")}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
