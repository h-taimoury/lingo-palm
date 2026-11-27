import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { djangoServerFetch } from "@/lib/api/server";
import { getOptionalCurrentUser } from "@/lib/auth/getOptionalCurrentUser";
import { loginHref } from "@/lib/auth/redirects";
import { formatExpiry } from "../payments/formatExpiry";
import { CheckoutButton } from "./CheckoutButton";
import { getLocale, getTranslations } from "@/lib/i18n/server";

type Plan = { price_tomans: number; days: number; checkout_available: boolean; expiry: string | null; sandbox: boolean };

export default async function PlansPage() {
  const t = await getTranslations();
  const locale = await getLocale();

  const [plan, user] = await Promise.all([
    djangoServerFetch<Plan>("/api/billing/plan/", { returnTo: "/plans" }),
    getOptionalCurrentUser("/plans"),
  ]);

  return (
    <section className="mx-auto max-w-lg space-y-5 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t("Course subscription")}</h1>
      <p className="text-muted-foreground">{t("Get {0} days of access to all published courses. Renew whenever you want.", { 0: plan.days })}</p>
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <p className="text-2xl font-semibold">{t("{0} tomans", { 0: plan.price_tomans.toLocaleString(locale) })}</p>
        {plan.expiry && <p>{t("Access expiry: {0}", { 0: formatExpiry(plan.expiry, locale) })}</p>}
        {plan.sandbox && <p className="text-sm text-muted-foreground">{t("Test checkout. No money will be charged.")}</p>}
        {plan.checkout_available ? user ? <CheckoutButton /> : (
          <Link href={loginHref("/plans")} className={buttonVariants()}>{t("Sign in to subscribe")}</Link>
        ) : <p className="text-muted-foreground">{t("Checkout is currently unavailable.")}</p>}
      </div>
    </section>
  );
}
