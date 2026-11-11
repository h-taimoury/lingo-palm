import { Fragment } from "react"
import { Menu } from "@base-ui/react/menu"
import { ChevronDown, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VocabularyBulkAction } from "@/types/api/vocabulary"

type Action = { action: VocabularyBulkAction; label: string; variant?: "destructive" }

const learnedVocabularyActions: readonly Action[] = [
  { action: "set_needs_review", label: "Add to review" },
  { action: "unset_needs_review", label: "Remove from review" },
  { action: "set_already_known", label: "Mark as already knew" },
  { action: "unset_already_known", label: "Clear already knew" },
  { action: "unset_learned", label: "Unlearn", variant: "destructive" },
]

export function VocabularyActionsMenu({ actions = learnedVocabularyActions, disabled, busy, onAction, align = "start" }: {
  actions?: readonly Action[]
  disabled: boolean
  busy: boolean
  onAction: (action: VocabularyBulkAction) => void
  align?: "start" | "end"
}) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        openOnHover={false}
        disabled={disabled || busy}
        render={<Button type="button" variant="outline" className="text-base" />}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        Actions for selected
        <ChevronDown className="size-4" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align={align} sideOffset={8} collisionPadding={12} className="z-50">
          <Menu.Popup className="w-60 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
            {actions.map(({ action, label, variant }) => (
              <Fragment key={action}>
                {variant === "destructive" ? <Menu.Separator className="my-1 h-px bg-border" /> : null}
                <Menu.Item
                  disabled={disabled || busy}
                  onClick={() => onAction(action)}
                  className={`flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${variant === "destructive" ? "text-destructive data-[highlighted]:bg-destructive/10" : "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"}`}
                >
                  {label}
                </Menu.Item>
              </Fragment>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
