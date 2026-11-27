"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localeCookie, parseLocale } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const label = locale === "fa" ? "زبان سایت" : "Site language";
  const itemClass = "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[checked]:bg-primary/10 data-[checked]:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        openOnHover={false}
        render={<Button variant="outline" />}
        disabled={pending}
        aria-busy={pending}
        aria-label={label}
        className="h-9 gap-1 bg-muted/40 px-2 text-sm font-normal focus-visible:ring-2 focus-visible:ring-ring dark:bg-muted/40"
      >
        <Languages aria-hidden="true" className="size-4" />
        <span className="flex w-17 items-center justify-between gap-1">
          <span lang={locale}>{locale === "fa" ? "فارسی" : "English"}</span>
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={12} className="z-50">
          <Menu.Popup className="w-44 max-w-[calc(100vw-2rem)] origin-[var(--transform-origin)] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 motion-reduce:transition-none">
            <Menu.Group>
              <Menu.GroupLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">{label}</Menu.GroupLabel>
              <Menu.RadioGroup
                value={locale}
                disabled={pending}
                className="space-y-1"
                onValueChange={(value) => {
                  const nextLocale = parseLocale(value);
                  document.cookie = `${localeCookie}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
                  startTransition(() => router.refresh());
                }}
              >
                <Menu.RadioItem value="en" label="English" closeOnClick className={itemClass}>
                  <span lang="en">English</span>
                  <Menu.RadioItemIndicator className="ms-auto"><Check aria-hidden="true" className="size-4" /></Menu.RadioItemIndicator>
                </Menu.RadioItem>
                <Menu.RadioItem value="fa" label="فارسی" closeOnClick className={itemClass}>
                  <span lang="fa">فارسی</span>
                  <Menu.RadioItemIndicator className="ms-auto"><Check aria-hidden="true" className="size-4" /></Menu.RadioItemIndicator>
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
