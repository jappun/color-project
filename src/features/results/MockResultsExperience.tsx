import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AnalyzeApiResponse,
  SuggestedQuestion,
  WorkupStep,
} from '../../lib/analyzeApi.ts'
import { buildStreamPlan, visiblePartText, type StreamPlan } from './streamUtils.ts'

const PAGE_LABELS = ['Your Diagnosis', 'Your Questions'] as const

const PAGE1_TITLE = 'Understanding Your Diagnosis'
const PAGE1_SUB =
  "Here's what your diagnosis means in plain language."

const PAGE2_TITLE = 'What to Expect Next'
const PAGE2_SUB =
  'Based on your diagnosis, here are the steps your care team may take. These are only one possible plan and you should confirm with your care team. '

const PAGE3_TITLE = 'Questions for Your Oncologist'
const PAGE3_SUB =
  'These questions will help you engage meaningfully with your care team.'

function splitDiagnosisBody(text: string): string[] {
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length > 0) return parts
  const t = text.trim()
  return t ? [t] : ['']
}

type MockResultsExperienceProps = {
  data: AnalyzeApiResponse
}

export function MockResultsExperience({ data }: MockResultsExperienceProps) {
  const [displayPage, setDisplayPage] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)
  const [completedPages, setCompletedPages] = useState<Set<number>>(
    () => new Set(),
  )
  const [showTabs, setShowTabs] = useState(false)

  const plans = useMemo(() => {
    const diagnosisParts = splitDiagnosisBody(data.diagnosis)
    const p1 = buildStreamPlan([PAGE1_TITLE, PAGE1_SUB, ...diagnosisParts])
    const p2 = buildStreamPlan([
      PAGE2_TITLE,
      PAGE2_SUB,
      ...data.workup.flatMap((s) => [s.title, s.explanation]),
    ])
    const p3 = buildStreamPlan([
      PAGE3_TITLE,
      PAGE3_SUB,
      ...data.questions.map((q) => q.question),
    ])
    return [p1, p2, p3] as const
  }, [data])

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
    <div className="relative w-full min-w-0 pb-28 sm:pb-24 lg:mx-auto lg:max-w-3xl">
      {showTabs ? (
        <nav
          className="sticky top-0 z-40 -mx-1 mb-8 px-1 pb-3 pt-1"
          aria-label="Results sections"
        >
          <div className="flex flex-wrap gap-1 rounded-2xl bg-white/50 p-1 shadow-sm shadow-violet-950/5">
            {PAGE_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => goToPage(i)}
                className={`cursor-pointer min-h-[44px] flex-1 rounded-xl px-2 py-2.5 text-center text-xs font-medium transition sm:text-sm ${
                  displayPage === i
                    ? 'bg-violet-800 text-violet-50 shadow-md shadow-violet-950/20'
                    : 'text-stone-600 hover:bg-violet-100/80 hover:text-violet-950'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
                <PageDiagnosis plan={plan} visibleWordCount={visibleWordCount} />
              ) : null}
              {displayPage === 1 ? (
                <PageNextSteps
                  plan={plan}
                  visibleWordCount={visibleWordCount}
                  steps={data.workup}
                />
              ) : null}
              {displayPage === 2 ? (
                <PageQuestions
                  plan={plan}
                  visibleWordCount={visibleWordCount}
                  items={data.questions}
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
          className="cursor-pointer fixed bottom-5 right-4 z-50 flex h-14 min-h-[56px] w-14 min-w-[56px] items-center justify-center rounded-2xl border border-violet-700/30 bg-gradient-to-b from-violet-800 to-violet-950 text-xl font-semibold text-violet-50 shadow-lg shadow-violet-950/35 transition hover:from-violet-700 hover:to-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 active:scale-[0.98] sm:bottom-8 sm:right-8"
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
  const bodyStart = 2
  const paragraphIndices = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, plan.partCount - bodyStart) },
        (_, j) => bodyStart + j,
      ),
    [plan.partCount],
  )

  return (
    <article className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
        {visiblePartText(plan, visibleWordCount, 0)}
      </h1>
      <p className="text-lg text-violet-900/85">
        {visiblePartText(plan, visibleWordCount, 1)}
      </p>
      <div className="space-y-4 text-[0.95rem] leading-relaxed text-stone-700">
        {paragraphIndices.map((partIndex) => (
          <p key={partIndex}>
            {visiblePartText(plan, visibleWordCount, partIndex)}
          </p>
        ))}
      </div>
    </article>
  )
}

function PageNextSteps({
  plan,
  visibleWordCount,
  steps,
}: {
  plan: StreamPlan
  visibleWordCount: number
  steps: WorkupStep[]
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
        AI-generated from guidelines — confirm with your care team
      </p>

      <ul className="space-y-4">
        {steps.map((step, i) => {
          const titleIdx = partBase + i * 2
          const bodyIdx = titleIdx + 1
          return (
            <li
              key={`${step.title}-${i}`}
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
  items,
}: {
  plan: StreamPlan
  visibleWordCount: number
  items: SuggestedQuestion[]
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
        {items.map((item, i) => {
          const qIdx = qBase + i
          return (
            <details
              key={`${item.question.slice(0, 48)}-${i}`}
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
                  {item.whatItMeans}
                </p>
              </div>
            </details>
          )
        })}
      </div>
    </article>
  )
}
