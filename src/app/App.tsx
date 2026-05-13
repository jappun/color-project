import { useCallback, useState } from 'react'
import {
  postAnalyze,
  type AnalyzeApiResponse,
} from '../lib/analyzeApi.ts'
import type { PatientIntakePayload } from '../features/intake/PatientIntakeForm.tsx'
import { PatientIntakeForm } from '../features/intake/PatientIntakeForm.tsx'
import { MockResultsExperience } from '../features/results/MockResultsExperience.tsx'

export function App() {
  const [phase, setPhase] = useState<'intake' | 'results'>('intake')
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeApiResponse | null>(
    null,
  )
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [resultsKey, setResultsKey] = useState(0)

  const handleIntakeComplete = useCallback(
    async (payload: PatientIntakePayload) => {
      setAnalyzeError(null)
      try {
        const result = await postAnalyze(payload)
        setAnalyzeResult(result)
        setResultsKey((k) => k + 1)
        setPhase('results')
      } catch (e) {
        setAnalyzeError(
          e instanceof Error ? e.message : 'Something went wrong.',
        )
      }
    },
    [],
  )

  return (
    <div className="min-h-dvh w-full min-w-0 bg-gradient-to-b from-[#f4f0fb] via-[#ebe4f7] to-[#e2daf2] font-sans text-stone-900">
      <main className="box-border flex w-full min-w-0 flex-col items-stretch px-4 py-10 sm:px-6 sm:py-14 lg:mx-auto lg:max-w-3xl">
        {phase === 'intake' ? (
          <>
            {analyzeError ? (
              <div
                role="alert"
                className="mb-4 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm"
              >
                {analyzeError}
              </div>
            ) : null}
            <PatientIntakeForm onSubmitSuccess={handleIntakeComplete} />
          </>
        ) : analyzeResult ? (
          <MockResultsExperience key={resultsKey} data={analyzeResult} />
        ) : null}
      </main>
    </div>
  )
}
