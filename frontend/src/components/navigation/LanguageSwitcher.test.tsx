import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { localeCookie } from "@/lib/i18n/messages";

const harness = vi.hoisted(() => ({ locale: "en", pending: false, refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: harness.refresh }) }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useTransition: () => [harness.pending, (action: () => void) => action()],
}));
vi.mock("@/lib/i18n/LocaleProvider", () => ({ useLocale: () => harness.locale }));
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  harness.locale = "en";
  harness.pending = false;
  harness.refresh.mockClear();
});

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Record<string, unknown>>(child)
    ? [child, ...elements(child.props.children as ReactNode)] : []);
}

function languageMenu() {
  const nodes = elements(LanguageSwitcher());
  return nodes.find((node) => node.type === Menu.RadioGroup) as ReactElement<{
    value: string; onValueChange: (value: string) => void;
  }>;
}

it("saves the explicit choice for all routes and refreshes the current page", () => {
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("location", { protocol: "https:" });
  const menu = languageMenu();
  expect(menu.props.value).toBe("en");
  menu.props.onValueChange("fa");
  expect(document.cookie).toBe(`${localeCookie}=fa; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
  expect(harness.refresh).toHaveBeenCalledOnce();
  harness.locale = "fa";
  const selected = languageMenu();
  expect(selected.props.value).toBe("fa");
  selected.props.onValueChange("en");
  expect(document.cookie).toContain(`${localeCookie}=en;`);
});

it("offers both languages with selection indicators and closes after choosing", () => {
  const items = elements(LanguageSwitcher()).filter((node) => node.type === Menu.RadioItem);
  expect(items.map((item) => item.props.value)).toEqual(["en", "fa"]);
  for (const item of items) {
    expect(item.props.closeOnClick).toBe(true);
    expect(elements(item).some((node) => node.type === Menu.RadioItemIndicator)).toBe(true);
  }
});

it("disables switching while the language refresh is pending", () => {
  harness.pending = true;
  const nodes = elements(LanguageSwitcher());
  expect(nodes.find((node) => node.type === Menu.Trigger)?.props.disabled).toBe(true);
  expect(nodes.find((node) => node.type === Menu.RadioGroup)?.props.disabled).toBe(true);
});
