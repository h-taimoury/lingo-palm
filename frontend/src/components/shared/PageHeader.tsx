import type { ReactNode } from "react"

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl">{eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}<h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>{description ? <p className="mt-3 leading-7 text-muted-foreground">{description}</p> : null}</div>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</header>
}
