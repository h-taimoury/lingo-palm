"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { LoaderCircle, LogOut, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorMessage } from "@/components/shared/ApiErrorMessage";
import { apiClient } from "@/lib/api/client";

export function AccountMenu({ userLabel }: { userLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef(false);

  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await apiClient.post("/api/users/logout/", {});
      router.replace("/login");
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const itemClass = "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-24 truncate text-sm text-muted-foreground sm:max-w-36" title={userLabel}>
        {userLabel}
      </span>
    <Menu.Root modal={false}>
      <Menu.Trigger
        openOnHover={false}
        render={<Button variant="outline" size="icon" />}
        className="size-10 rounded-full bg-muted/40 text-muted-foreground hover:text-foreground data-[popup-open]:bg-accent data-[popup-open]:text-foreground"
        aria-label="Your account"
        title="Your account"
      >
        <UserRound className="size-5" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={12} className="z-50">
          <Menu.Popup className="w-64 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
            <Menu.Group>
              <Menu.LinkItem render={<Link href="/account" />} className={itemClass}>
                <Settings className="size-4" aria-hidden="true" />Account settings
              </Menu.LinkItem>
            </Menu.Group>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item disabled={busy} closeOnClick={false} onClick={() => void signOut()} className={itemClass}>
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
              {busy ? "Signing out…" : "Sign out"}
            </Menu.Item>
            {error ? <div className="p-2"><ApiErrorMessage error={error} /></div> : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
    </div>
  );
}
