import { PatientIntakeForm } from '../features/intake/PatientIntakeForm.tsx'

export function App() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#f4f0fb] via-[#ebe4f7] to-[#e2daf2] font-sans text-stone-900">
      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-10 sm:py-14">
        <PatientIntakeForm />
      </main>
    </div>
  )
}
