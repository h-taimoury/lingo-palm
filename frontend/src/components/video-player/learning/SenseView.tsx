import { Badge } from "@/components/ui/badge"
import type { SenseSummary } from "@/types/api/dictionary"

export function SenseView({ sense, learned }: { sense: SenseSummary; learned: boolean }) {
  return <div><div className="flex flex-wrap items-baseline gap-2"><h3 className="text-2xl font-semibold tracking-tight">{sense.entry.word}</h3><span className="text-sm italic text-muted-foreground">{sense.entry.part_of_speech}</span>{sense.sense_number ? <span className="text-xs text-muted-foreground">Sense {sense.sense_number}</span> : null}</div>{sense.title ? <p className="mt-2 text-sm font-medium text-muted-foreground">{sense.title}</p> : null}<p className="mt-4 text-base leading-7">{sense.definition}</p>{learned ? <div className="mt-5"><Badge variant="secondary">Already learned</Badge></div> : null}</div>
}
