"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"

import { LogoutButton } from "@/components/auth/LogoutButton"
import type { NavItem } from "./nav-links"
import { SheetLink } from "./SheetLink"

type NavbarMenuSheetProps = {
  links: readonly NavItem[]
  utilityLinks: readonly NavItem[]
  contextLabel?: string
  userLabel: string
}

export function NavbarMenuSheet({
  links,
  utilityLinks,
  contextLabel,
  userLabel,
}: NavbarMenuSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function closeMenu() {
    dialogRef.current?.close()
  }

  function openMenu() {
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal()
      setOpen(true)
    }
  }

  useEffect(() => {
    if (dialogRef.current?.open) dialogRef.current.close()
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        className="inline-flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu()
        }}
        className="fixed inset-0 z-50 m-0 hidden h-dvh max-h-none w-dvw max-w-none justify-end bg-transparent p-0 text-foreground open:flex backdrop:bg-foreground/25 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-full w-full max-w-sm flex-col border-l bg-background shadow-2xl">
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
            <div>
              <p id={titleId} className="font-semibold tracking-tight">
                LingoPalm
              </p>
              <p className="text-xs font-medium text-primary">
                {contextLabel ? `${contextLabel} navigation` : "Navigation"}
              </p>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              className="inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close navigation menu"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <nav aria-label="Primary navigation" className="space-y-1">
              {links.map((item) => (
                <SheetLink key={item.href} item={item} onNavigate={closeMenu} />
              ))}
            </nav>

            {utilityLinks.length > 0 ? (
              <div className="mt-6 border-t pt-5">
                <p className="mb-2 px-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  More
                </p>
                <nav aria-label="Secondary navigation" className="space-y-1">
                  {utilityLinks.map((item) => (
                    <SheetLink key={item.href} item={item} onNavigate={closeMenu} />
                  ))}
                </nav>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t bg-muted/40 p-4">
            <p className="mb-3 truncate px-1 text-sm text-muted-foreground" title={userLabel}>
              Signed in as <span className="font-medium text-foreground">{userLabel}</span>
            </p>
            <LogoutButton className="h-10 w-full border bg-background" />
          </div>
        </div>
      </dialog>
    </>
  )
}
