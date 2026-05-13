import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  PAGE1_PARTS,
  PAGE2,
  PAGE3,
} from './mockResultsContent.ts'
import { buildStreamPlan, visiblePartText, type StreamPlan } from './streamUtils.ts'

const PAGE_LABELS = ['Your Diagnosis', "What's Next", 'Your Questions'] as const

export function MockResultsExperience() {
  const [displayPage, setDisplayPage] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)
  const [completedPages, setCompletedPages] = useState<Set<number>>(
    () => new Set(),
  )
  const [showTabs, setShowTabs] = useState(false)

  const plans = useMemo(() => {
    const p1 = buildStreamPlan([
      PAGE1_PARTS.heading,
      PAGE1_PARTS.subheading,
      ...PAGE1_PARTS.paragraphs,
    ])
    const p2 = buildStreamPlan([
      PAGE2.heading,
      PAGE2.subheading,
      ...PAGE2.steps.flatMap((s) => [s.title, s.body]),
    ])
    const p3 = buildStreamPlan([
      PAGE3.heading,
      PAGE3.subheading,
      ...PAGE3.items.map((i) => i.question),
    ])
    return [p1, p2, p3] as const
  }, [])

  const plan = plans[displayPage]
  const streamFrozen = completedPages.has(displayPage)

  const handleStreamComplete = useCallback(() => {
    setCompletedPages((prev) => {
      const next = new Set(prev)
      next.add(displayPage)
      return next
    })
    if (displayPage === 2) {
      setShowTabs(true)
    }
  }, [displayPage])

  const streamDoneForPage = completedPages.has(displayPage)
  const showNextArrow =
    !showTabs && streamDoneForPage && displayPage < plans.length - 1

  function goNext() {
    setContentVisible(false)
    window.setTimeout(() => {
      setDisplayPage((p) => Math.min(p + 1, plans.length - 1))
      setContentVisible(true)
    }, 200)
  }

  function goToPage(index: number) {
    setContentVisible(false)
    window.setTimeout(() => {
      setDisplayPage(index)
      setContentVisible(true)
    }, 180)
  }

  return (
    <div className="relative w-full max-w-2xl pb-28 sm:pb-24">
      {showTabs ? (
        <nav
          className="sticky top-0 z-40 -mx-1 mb-8 border-b border-violet-200/60 bg-[#f4f0fb]/90 px-1 pb-3 pt-1 backdrop-blur-md"
          aria-label="Results sections"
        >
          <div className="flex flex-wrap gap-1 rounded-2xl bg-white/50 p-1 shadow-sm shadow-violet-950/5">
            {PAGE_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => goToPage(i)}
                className={`min-h-[44px] flex-1 rounded-xl px-2 py-2.5 text-center text-xs font-medium transition sm:text-sm ${
                  displayPage === i
                    ? 'bg-violet-800 text-violet-50 shadow-md shadow-violet-950/20'
                    : 'text-stone-600 hover:bg-violet-100/80 hover:text-violet-950'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">

          </p>
        </nav>
      ) : null}

      <div
        className={`transition-all duration-300 ease-out ${
          contentVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-1.5 opacity-0'
        }`}
      >
        <PageWithStream
          key={displayPage}
          frozen={streamFrozen}
          totalWords={plan.allWords.length}
          intervalMs={42}
          onComplete={handleStreamComplete}
        >
          {(visibleWordCount) => (
            <>
              {displayPage === 0 ? (
                <PageDiagnosis
                  plan={plan}
                  visibleWordCount={visibleWordCount}
                />
              ) : null}
              {displayPage === 1 ? (
                <PageNextSteps
                  plan={plan}
                  visibleWordCount={visibleWordCount}
                />
              ) : null}
              {displayPage === 2 ? (
                <PageQuestions
                  plan={plan}
                  visibleWordCount={visibleWordCount}
                />
              ) : null}
            </>
          )}
        </PageWithStream>
      </div>

      {showNextArrow ? (
        <button
          type="button"
          onClick={goNext}
          aria-label="Next page"
          className="fixed bottom-5 right-4 z-50 flex h-14 min-h-[56px] w-14 min-w-[56px] items-center justify-center rounded-2xl border border-violet-700/30 bg-gradient-to-b from-violet-800 to-violet-950 text-xl font-semibold text-violet-50 shadow-lg shadow-violet-950/35 transition hover:from-violet-700 hover:to-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 active:scale-[0.98] sm:bottom-8 sm:right-8"
        >
          →
        </button>
      ) : null}
    </div>
  )
}

type PageWithStreamProps = {
  frozen: boolean
  totalWords: number
  intervalMs: number
  onComplete: () => void
  children: (visibleWordCount: number) => ReactNode
}

function PageWithStream({
  frozen,
  totalWords,
  intervalMs,
  onComplete,
  children,
}: PageWithStreamProps) {
  const [n, setN] = useState(0)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (frozen) {
      return
    }
    if (totalWords <= 0) {
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current()
      }
      return
    }
    if (n >= totalWords) {
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current()
      }
      return
    }
    const id = window.setTimeout(() => {
      setN((x) => x + 1)
    }, intervalMs)
    return () => window.clearTimeout(id)
  }, [frozen, n, totalWords, intervalMs])

  const visible = frozen ? totalWords : n
  return <>{children(visible)}</>
}

function PageDiagnosis({
  plan,
  visibleWordCount,
}: {
  plan: StreamPlan
  visibleWordCount: number
}) {
  return (
    <article className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
        {visiblePartText(plan, visibleWordCount, 0)}
      </h1>
      <p className="text-lg text-violet-900/85">
        {visiblePartText(plan, visibleWordCount, 1)}
      </p>
      <div className="space-y-4 text-[0.95rem] leading-relaxed text-stone-700">
        {PAGE1_PARTS.paragraphs.map((_, i) => (
          <p key={i}>{visiblePartText(plan, visibleWordCount, 2 + i)}</p>
        ))}
      </div>
    </article>
  )
}

function PageNextSteps({
  plan,
  visibleWordCount,
}: {
  plan: StreamPlan
  visibleWordCount: number
}) {
  const partBase = 2
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          {visiblePartText(plan, visibleWordCount, 0)}
        </h1>
        <p className="text-lg text-violet-900/85">
          {visiblePartText(plan, visibleWordCount, 1)}
        </p>
      </header>

      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-stone-400">
        Demo mode — mock clinical data only
      </p>

      <ul className="space-y-4">
        {PAGE2.steps.map((step, i) => {
          const titleIdx = partBase + i * 2
          const bodyIdx = titleIdx + 1
          return (
            <li
              key={step.title}
              className="rounded-2xl border border-violet-200/50 bg-white/80 p-4 shadow-sm shadow-violet-950/5 sm:p-5"
            >
              <h2 className="text-base font-semibold text-violet-950">
                {visiblePartText(plan, visibleWordCount, titleIdx)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {visiblePartText(plan, visibleWordCount, bodyIdx)}
              </p>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

function PageQuestions({
  plan,
  visibleWordCount,
}: {
  plan: StreamPlan
  visibleWordCount: number
}) {
  const qBase = 2
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          {visiblePartText(plan, visibleWordCount, 0)}
        </h1>
        <p className="text-lg text-violet-900/85">
          {visiblePartText(plan, visibleWordCount, 1)}
        </p>
      </header>

      <div className="space-y-3">
        {PAGE3.items.map((item, i) => {
          const qIdx = qBase + i
          return (
            <details
              key={i}
              className="group rounded-2xl border border-violet-200/45 bg-white/85 shadow-sm shadow-violet-950/5 open:border-violet-300/60 open:bg-white"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden sm:px-5 sm:py-4">
                <span className="min-w-0 flex-1 font-bold leading-snug text-stone-900">
                  {visiblePartText(plan, visibleWordCount, qIdx)}
                </span>
                <span
                  className="mt-0.5 shrink-0 text-violet-600 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                >
                  ▼
                </span>
              </summary>
              <div className="space-y-3 border-t border-violet-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-stone-600 sm:px-5">
                <p>
                  <span className="font-medium text-stone-800">
                    Why ask this:{' '}
                  </span>
                  {item.whyAsk}
                </p>
                <p>
                  <span className="font-medium text-stone-800">
                    What the answer might mean:{' '}
                  </span>
                  {item.whatMeans}
                </p>
              </div>
            </details>
          )
        })}
      </div>
    </article>
  )
}
