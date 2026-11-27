import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { djangoServerFetch } from "@/lib/api/server";
import { buttonVariants } from "@/components/ui/button";
import { formatExpiry } from "../formatExpiry";
import { CheckStatusButton } from "./CheckStatusButton";
import { getLocale, getTranslations } from "@/lib/i18n/server";

type Order = { reference: string; state: "pending" | "fulfilled" | "failed"; amount_tomans: number; expiry: string | null; support_email: string };

export default async function PaymentPage({ params, searchParams }: {
  params: Promise<{ orderRef: string }>;
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();

  const { orderRef } = await params;
  if (!/^[a-f0-9-]{36}$/u.test(orderRef)) notFound();
  const incomplete = (await searchParams).checkout === "incomplete";
  const returnTo = `/payments/${orderRef}${incomplete ? "?checkout=incomplete" : ""}`;
  const order = await djangoServerFetch<Order>(`/api/billing/orders/${orderRef}/`, { returnTo })
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    });

  return (
    <section className="mx-auto max-w-lg space-y-5 px-4 py-12">
      <h1 className="text-3xl font-semibold">{order.state === "fulfilled" ? t("Course access activated") : order.state === "failed" ? t("Payment did not complete") : incomplete ? t("Checkout was interrupted") : t("We’re checking your payment")}</h1>
      {incomplete && order.state === "pending" && <p className="text-muted-foreground">{t("We’re waiting for ZarinPal to confirm the final payment status.")}</p>}
      <dl className="space-y-2 rounded-xl border bg-card p-5 text-sm">
        <div><dt className="font-medium">{t("Order reference")}</dt><dd dir="ltr" className="break-all">{order.reference}</dd></div>
        <div><dt className="font-medium">{t("Amount")}</dt><dd>{t("{0} tomans", { 0: order.amount_tomans.toLocaleString(locale) })}</dd></div>
        {order.expiry && <div><dt className="font-medium">{t("Access expiry")}</dt><dd>{formatExpiry(order.expiry, locale)}</dd></div>}
      </dl>
      {order.support_email && <p className="text-sm">{t("For help, email")} <a className="underline" href={`mailto:${order.support_email}`}>{order.support_email}</a>  {t("with your order reference.")}</p>}
      {order.state === "pending" ? <CheckStatusButton /> : <Link href={order.state === "fulfilled" ? "/courses" : "/plans"} className={buttonVariants()}>{order.state === "fulfilled" ? t("Browse courses") : t("Back to plans")}</Link>}
    </section>
  );
}
