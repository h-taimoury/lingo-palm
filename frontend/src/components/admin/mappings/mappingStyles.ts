const mappingColors = [
  "bg-sky-200 text-sky-950 ring-sky-500/40",
  "bg-emerald-200 text-emerald-950 ring-emerald-500/40",
  "bg-violet-200 text-violet-950 ring-violet-500/40",
  "bg-amber-200 text-amber-950 ring-amber-500/40",
  "bg-rose-200 text-rose-950 ring-rose-500/40",
  "bg-cyan-200 text-cyan-950 ring-cyan-500/40",
] as const

export function mappingColor(id: number) {
  return mappingColors[Math.abs(id) % mappingColors.length]
}
