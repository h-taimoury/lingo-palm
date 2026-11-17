import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { djangoServerFetch } from "@/lib/api/server";
import { getOptionalCurrentUser } from "@/lib/auth/getOptionalCurrentUser";
import { loginHref } from "@/lib/auth/redirects";
import { formatExpiry } from "../payments/formatExpiry";
import { CheckoutButton } from "./CheckoutButton";

type Plan = { price_tomans: number; days: number; checkout_available: boolean; expiry: string | null; sandbox: boolean };

export default async function PlansPage() {
  const [plan, user] = await Promise.all([
    djangoServerFetch<Plan>("/api/billing/plan/", { returnTo: "/plans" }),
    getOptionalCurrentUser("/plans"),
  ]);

  return (
    <section className="mx-auto max-w-lg space-y-5 px-4 py-12">
      <h1 className="text-3xl font-semibold">Course subscription</h1>
      <p className="text-muted-foreground">Get {plan.days} days of access to all published courses. Renew whenever you want.</p>
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <p className="text-2xl font-semibold">{plan.price_tomans.toLocaleString("en-US")} tomans</p>
        {plan.expiry && <p>Access expiry: {formatExpiry(plan.expiry)}</p>}
        {plan.sandbox && <p className="text-sm text-muted-foreground">Test checkout. No money will be charged.</p>}
        {plan.checkout_available ? user ? <CheckoutButton /> : (
          <Link href={loginHref("/plans")} className={buttonVariants()}>Sign in to subscribe</Link>
        ) : <p className="text-muted-foreground">Checkout is currently unavailable.</p>}
      </div>
    </section>
  );
}
