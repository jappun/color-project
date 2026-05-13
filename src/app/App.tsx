import { PatientIntakeForm } from '../features/intake/PatientIntakeForm.tsx'

export function App() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#faf6f1] via-[#f7f2ec] to-[#f3ebe3] font-sans text-stone-900">
      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-10 sm:py-14">
        <PatientIntakeForm />
      </main>
    </div>
  )
}
