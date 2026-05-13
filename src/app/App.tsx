import { useState } from 'react'
import { PatientIntakeForm } from '../features/intake/PatientIntakeForm.tsx'
import { MockResultsExperience } from '../features/results/MockResultsExperience.tsx'

export function App() {
  const [phase, setPhase] = useState<'intake' | 'results'>('intake')

  return (
    <div className="min-h-dvh w-full min-w-0 bg-gradient-to-b from-[#f4f0fb] via-[#ebe4f7] to-[#e2daf2] font-sans text-stone-900">
      <main className="box-border flex w-full min-w-0 flex-col items-stretch px-4 py-10 sm:px-6 sm:py-14 lg:mx-auto lg:max-w-3xl">
        {phase === 'intake' ? (
          <PatientIntakeForm onSubmitSuccess={() => setPhase('results')} />
        ) : (
          <MockResultsExperience />
        )}
      </main>
    </div>
  )
}
