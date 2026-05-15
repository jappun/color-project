/** Split into words for simulated streaming (whitespace collapsed). */
export function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

export type StreamPlan = {
  allWords: string[]
  /** Start index in allWords for each part; length parts.length+1 with last = allWords.length */
  offsets: number[]
  partCount: number
}

export function buildStreamPlan(parts: readonly string[]): StreamPlan {
  const offsets: number[] = []
  const allWords: string[] = []
  let at = 0
  for (const p of parts) {
    offsets.push(at)
    const w = wordsOf(p)
    allWords.push(...w)
    at += w.length
  }
  offsets.push(at)
  return { allWords, offsets, partCount: parts.length }
}

export function visiblePartText(
  plan: StreamPlan,
  visibleWordCount: number,
  partIndex: number,
): string {
  const start = plan.offsets[partIndex] ?? 0
  const end = plan.offsets[partIndex + 1] ?? 0
  const take = Math.max(0, Math.min(visibleWordCount, end) - start)
  if (take <= 0) return ''
  return plan.allWords.slice(start, start + take).join(' ')
}
