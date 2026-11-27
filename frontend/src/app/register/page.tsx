import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getTranslations } from "@/lib/i18n/server";

export default async function RegisterPage() {
  const t = await getTranslations();

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>  {t("Back to home")}</Link>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">{t("Create your account")}</CardTitle>
            <CardDescription>
              {t("Learn exact English meanings from the videos and contexts where they appear.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("Already have an account?")}{" "}
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="/login"
              >
                {t("Sign in")}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
