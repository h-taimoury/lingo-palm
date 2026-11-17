import { Children, isValidElement, type ReactElement, type ReactNode, type SubmitEvent } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { RegisterForm } from "./RegisterForm";
import { LoginForm } from "./LoginForm";
import { EmailRequestForm } from "./EmailRequestForm";
import { VerifyEmailForm } from "./VerifyEmailForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { AccountForm } from "@/components/account/AccountForm";
import { UserManager } from "@/components/admin/users/UserManager";
import type { User } from "@/types/api/users";

const harness = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, post: vi.fn(), patch: vi.fn(), replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: () => {},
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = initial;
    return [harness.slots[slot], (value: unknown) => { harness.slots[slot] = typeof value === "function" ? value(harness.slots[slot]) : value; }];
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: harness.replace, push: harness.push, refresh: harness.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { post: harness.post, patch: harness.patch } }));

type Element = ReactElement<{ children?: ReactNode; disabled?: boolean; name?: string; onClick?: () => void; onSubmit?: (event: SubmitEvent<HTMLFormElement>) => Promise<void> }>;
function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Element["props"]>(child) ? [child, ...elements(child.props.children)] : []);
}
function render(component: () => ReactNode) { harness.cursor = 0; return elements(component()); }
async function submit(component: () => ReactNode, fields: Record<string, string>) {
  vi.stubGlobal("FormData", class { get(name: string) { return fields[name] ?? null; } });
  const form = render(component).find((element) => element.type === "form")!;
  await form.props.onSubmit!({ preventDefault: vi.fn(), currentTarget: { elements: { namedItem: () => null } } } as unknown as SubmitEvent<HTMLFormElement>);
}
beforeEach(() => {
  harness.slots = [];
  harness.cursor = 0;
  vi.resetAllMocks();
  vi.stubGlobal("window", { history: { replaceState: vi.fn() } });
  vi.stubGlobal("HTMLInputElement", class {});
});
afterEach(() => vi.unstubAllGlobals());

it("blocks registration when confirmation differs", async () => {
  await submit(RegisterForm, { email: "learner@example.com", password: "forest123", password_confirm: "different" });
  expect(harness.post).not.toHaveBeenCalled();
  expect(harness.slots[0]).toMatchObject({ message: "Passwords do not match." });
});

it("registration submits confirmation and opens check-email instead of courses", async () => {
  harness.post.mockResolvedValue({ detail: "Check your email" });
  await submit(RegisterForm, { email: "learner@example.com", password: "forest123", password_confirm: "forest123" });
  expect(harness.post).toHaveBeenCalledWith("/api/users/register/", expect.objectContaining({ password_confirm: "forest123" }), { retryOnUnauthorized: false });
  expect(harness.replace).toHaveBeenCalledWith("/verify-email?email=learner%40example.com&sent=1");
});

it("unverified login opens the resend flow", async () => {
  harness.post.mockRejectedValue(new ApiError({ status: 403, message: "Verify email", data: { code: "email_not_verified" } }));
  await submit(LoginForm, { email: "learner@example.com", password: "forest123" });
  expect(harness.push).toHaveBeenCalledWith("/verify-email?email=learner%40example.com");
  expect(harness.post.mock.calls[0][2]).toMatchObject({ retryOnUnauthorized: false, redirectOnUnauthorized: false });
});

it("verification waits for a user action before consuming the link", async () => {
  const component = () => VerifyEmailForm({ token: "signed-link" });
  render(component);
  expect(harness.post).not.toHaveBeenCalled();
  harness.post.mockResolvedValue({ detail: "Your email is verified." });
  await submit(component, {});
  expect(harness.post).toHaveBeenCalledWith("/api/users/verify-email/", { token: "signed-link" }, { retryOnUnauthorized: false });
  expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "/verify-email");
});

it("resend starts a cooldown and preserves the generic response", async () => {
  const component = () => EmailRequestForm({ kind: "verification" });
  harness.post.mockResolvedValue({ detail: "If verification is needed, we've sent a verification email." });
  await submit(component, { email: "learner@example.com" });
  expect(harness.post.mock.calls[0][0]).toBe("/api/users/resend-verification/");
  expect(harness.slots[1]).toContain("If verification is needed");
  expect(render(component).find((element) => element.type === Button)?.props.disabled).toBe(true);
});

it("forgot password requests a reset email", async () => {
  harness.post.mockResolvedValue({ detail: "If an eligible account exists, we've sent instructions." });
  await submit(() => EmailRequestForm({ kind: "reset" }), { email: "learner@example.com" });
  expect(harness.post.mock.calls[0][0]).toBe("/api/users/forgot-password/");
});

it("password reset blocks mismatches and submits the token with matching passwords", async () => {
  const component = () => ResetPasswordForm({ uid: "MQ", token: "reset-token" });
  await submit(component, { password: "forest123", password_confirm: "different" });
  expect(harness.post).not.toHaveBeenCalled();
  harness.post.mockResolvedValue({ detail: "Password reset. Sign in." });
  await submit(component, { password: "forest123", password_confirm: "forest123" });
  expect(harness.post).toHaveBeenCalledWith("/api/users/reset-password/", { uid: "MQ", token: "reset-token", password: "forest123", password_confirm: "forest123" }, { retryOnUnauthorized: false });
  expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "/reset-password");
});

const user: User = {
  id: 1, email: "learner@example.com", first_name: "Learner", last_name: "Test",
  full_name: "Learner Test", created_at: "2026-11-18T00:00:00Z",
  is_staff: false, is_superuser: false, email_verified: true, pending_email: "",
};

it("account email changes include the current password and explain pending verification", async () => {
  harness.patch.mockResolvedValue({ ...user, pending_email: "new@example.com" });
  await submit(() => AccountForm({ user }), { email: "new@example.com", current_password: "forest123" });
  expect(harness.patch).toHaveBeenCalledWith("/api/users/me/", expect.objectContaining({ email: "new@example.com", current_password: "forest123" }));
  expect(harness.slots[2]).toContain("current email stays active");
});

it("account password changes require matching confirmation and return to sign in", async () => {
  const component = () => AccountForm({ user });
  await submit(component, { email: user.email, password: "new-password", password_confirm: "wrong" });
  expect(harness.patch).not.toHaveBeenCalled();
  harness.patch.mockResolvedValue(user);
  await submit(component, { email: user.email, current_password: "forest123", password: "new-password", password_confirm: "new-password" });
  expect(harness.patch).toHaveBeenCalledWith("/api/users/me/", expect.objectContaining({ current_password: "forest123", password: "new-password", password_confirm: "new-password" }));
  expect(harness.replace).toHaveBeenCalledWith("/login");
});

it("only exposes manual verification for a superuser editing another unverified account", () => {
  for (const [canVerifyEmail, isSelf, email_verified, visible] of [[true, false, false, true], [false, false, false, false], [true, true, false, false], [true, false, true, false]]) {
    harness.slots = [];
    const component = () => UserManager({ user: { ...user, email_verified, is_active: true }, isSelf, canVerifyEmail });
    render(component).find((element) => element.type === Button && element.props.children === "Edit")!.props.onClick!();
    expect(render(component).some((element) => element.props.name === "email_verified")).toBe(visible);
  }
});

it("only submits a manual verification grant when the superuser control is available", async () => {
  for (const canVerifyEmail of [true, false]) {
    harness.slots = [];
    harness.patch.mockClear();
    harness.patch.mockResolvedValue({ ...user, email_verified: true, is_active: true });
    const component = () => UserManager({ user: { ...user, email_verified: false, is_active: true }, isSelf: false, canVerifyEmail });
    render(component).find((element) => element.type === Button && element.props.children === "Edit")!.props.onClick!();
    await submit(component, { email: user.email, is_active: "on", email_verified: "on" });
    expect(harness.patch.mock.calls[0][1].email_verified).toBe(canVerifyEmail ? true : undefined);
  }
});
