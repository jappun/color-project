import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

const CANCER_TYPES = [
  { value: 'breast', label: 'Breast cancer' },
  { value: 'lung', label: 'Lung cancer' },
  { value: 'colorectal', label: 'Colorectal cancer' },
  { value: 'prostate', label: 'Prostate cancer' },
  { value: 'melanoma', label: 'Melanoma' },
  { value: 'other', label: 'Other / not listed' },
] as const

type CancerTypeValue = (typeof CANCER_TYPES)[number]['value']

const STAGES = [
  { value: 'I', label: 'Stage I' },
  { value: 'II', label: 'Stage II' },
  { value: 'III', label: 'Stage III' },
  { value: 'IV', label: 'Stage IV' },
  { value: 'unknown', label: 'Unknown / not yet staged' },
] as const

const SEX_ASSIGNED_AT_BIRTH = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'intersex', label: 'Intersex' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

type SexAssignedValue = (typeof SEX_ASSIGNED_AT_BIRTH)[number]['value']

export type PatientIntakePayload = {
  cancerType: CancerTypeValue | ''
  cancerTypeLabel: string | null
  otherCancerDetail: string | null
  stage: (typeof STAGES)[number]['value'] | ''
  stageLabel: string | null
  age: number | null
  sexAssignedAtBirth: SexAssignedValue | ''
  sexAssignedAtBirthLabel: string | null
  priorCancerTreatment: boolean
  metWithOncologist: 'yes' | 'no'
  mainAnxiety: string | null
}

function findCancerLabel(value: string): string | null {
  const row = CANCER_TYPES.find((t) => t.value === value)
  return row?.label ?? null
}

function findStageLabel(value: string): string | null {
  const row = STAGES.find((s) => s.value === value)
  return row?.label ?? null
}

function findSexAssignedLabel(value: string): string | null {
  const row = SEX_ASSIGNED_AT_BIRTH.find((s) => s.value === value)
  return row?.label ?? null
}

export function PatientIntakeForm() {
  const formId = useId()
  const cancerListId = `${formId}-cancer-list`
  const cancerFieldId = `${formId}-cancer`

  const [cancerType, setCancerType] = useState<CancerTypeValue | ''>('')
  const [cancerQuery, setCancerQuery] = useState('')
  const [cancerOpen, setCancerOpen] = useState(false)
  const [activeCancerIndex, setActiveCancerIndex] = useState(0)
  const [otherCancerDetail, setOtherCancerDetail] = useState('')

  const [stage, setStage] = useState<(typeof STAGES)[number]['value'] | ''>(
    '',
  )
  const [age, setAge] = useState('')
  const [sexAssignedAtBirth, setSexAssignedAtBirth] = useState<
    SexAssignedValue | ''
  >('')

  const [priorCancerTreatment, setPriorCancerTreatment] = useState(false)
  const [metWithOncologist, setMetWithOncologist] = useState<'yes' | 'no' | ''>(
    '',
  )
  const [mainAnxiety, setMainAnxiety] = useState('')

  const [oncologistError, setOncologistError] = useState(false)
  const [otherCancerError, setOtherCancerError] = useState(false)

  const comboboxRef = useRef<HTMLDivElement>(null)

  const filteredCancerTypes = useMemo(() => {
    const q = cancerQuery.trim().toLowerCase()
    if (!q) return [...CANCER_TYPES]
    return CANCER_TYPES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q),
    )
  }, [cancerQuery])

  const highlightedCancerIndex = useMemo(() => {
    const len = filteredCancerTypes.length
    if (len === 0) return 0
    return Math.min(Math.max(activeCancerIndex, 0), len - 1)
  }, [activeCancerIndex, filteredCancerTypes.length])

  const syncCancerQueryFromValue = useCallback(() => {
    setCancerQuery(cancerType ? (findCancerLabel(cancerType) ?? '') : '')
  }, [cancerType])

  useEffect(() => {
    if (!cancerOpen) return
    function handlePointerDown(event: MouseEvent) {
      const el = comboboxRef.current
      if (el && !el.contains(event.target as Node)) {
        setCancerOpen(false)
        syncCancerQueryFromValue()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [cancerOpen, syncCancerQueryFromValue])

  function selectCancer(value: CancerTypeValue) {
    setCancerType(value)
    setCancerQuery(findCancerLabel(value) ?? '')
    setCancerOpen(false)
    if (value !== 'other') {
      setOtherCancerDetail('')
      setOtherCancerError(false)
    }
  }

  function handleCancerInputChange(value: string) {
    setActiveCancerIndex(0)
    setCancerQuery(value)
    setCancerOpen(true)
    if (cancerType) {
      const match = CANCER_TYPES.find(
        (t) => t.label.toLowerCase() === value.trim().toLowerCase(),
      )
      if (!match) {
        setCancerType('')
        setOtherCancerDetail('')
      }
    }
  }

  function handleCancerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!cancerOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setActiveCancerIndex(0)
      setCancerOpen(true)
      return
    }
    if (!cancerOpen) return

    if (e.key === 'Escape') {
      e.preventDefault()
      setCancerOpen(false)
      syncCancerQueryFromValue()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveCancerIndex((i) =>
        filteredCancerTypes.length === 0
          ? 0
          : Math.min(i + 1, filteredCancerTypes.length - 1),
      )
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveCancerIndex((i) =>
        filteredCancerTypes.length === 0 ? 0 : Math.max(i - 1, 0),
      )
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const pick = filteredCancerTypes[highlightedCancerIndex]
      if (pick) selectCancer(pick.value)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    let valid = true
    if (metWithOncologist !== 'yes' && metWithOncologist !== 'no') {
      setOncologistError(true)
      valid = false
    } else {
      setOncologistError(false)
    }

    if (cancerType === 'other' && otherCancerDetail.trim() === '') {
      setOtherCancerError(true)
      valid = false
    } else {
      setOtherCancerError(false)
    }

    if (!valid) return

    const payload: PatientIntakePayload = {
      cancerType,
      cancerTypeLabel: cancerType ? findCancerLabel(cancerType) : null,
      otherCancerDetail:
        cancerType === 'other' ? otherCancerDetail.trim() : null,
      stage,
      stageLabel: stage ? findStageLabel(stage) : null,
      age: age === '' ? null : Number(age),
      sexAssignedAtBirth,
      sexAssignedAtBirthLabel: sexAssignedAtBirth
        ? findSexAssignedLabel(sexAssignedAtBirth)
        : null,
      priorCancerTreatment,
      metWithOncologist: metWithOncologist as 'yes' | 'no',
      mainAnxiety: mainAnxiety.trim() === '' ? null : mainAnxiety.trim(),
    }

    console.log('Patient intake (demo)', payload)
  }

  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23787169'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`

  return (
    <div className="w-full max-w-lg">
      <div
        role="status"
        className="mb-6 rounded-2xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950 shadow-sm shadow-amber-900/5"
      >
        Demo mode — mock clinical data only.
      </div>

      <div className="rounded-3xl border border-stone-200/90 bg-white/90 p-6 shadow-xl shadow-stone-900/5 backdrop-blur-sm sm:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[1.65rem]">
            Tell us a bit about you
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-stone-600">
            This helps your care team prepare resources that fit your situation.
            You can skip anything you are not comfortable sharing yet.
          </p>
        </header>

        <form className="space-y-7" onSubmit={handleSubmit} noValidate>
          <div ref={comboboxRef} className="relative space-y-2">
            <label
              htmlFor={cancerFieldId}
              className="block text-sm font-medium text-stone-800"
            >
              Cancer type
            </label>
            <p className="text-xs text-stone-500">
              Search or choose from common types.
            </p>
            <input
              id={cancerFieldId}
              type="text"
              role="combobox"
              aria-expanded={cancerOpen}
              aria-controls={cancerListId}
              aria-autocomplete="list"
              autoComplete="off"
              value={
                cancerOpen
                  ? cancerQuery
                  : cancerType
                    ? (findCancerLabel(cancerType) ?? '')
                    : cancerQuery
              }
              onChange={(e) => handleCancerInputChange(e.target.value)}
              onFocus={() => {
                setActiveCancerIndex(0)
                setCancerOpen(true)
                if (cancerType) setCancerQuery(findCancerLabel(cancerType) ?? '')
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  if (!comboboxRef.current?.contains(document.activeElement)) {
                    setCancerOpen(false)
                    syncCancerQueryFromValue()
                  }
                }, 0)
              }}
              onKeyDown={handleCancerKeyDown}
              placeholder="e.g. breast, lung…"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-stone-900 shadow-inner shadow-stone-900/5 outline-none transition placeholder:text-stone-400 focus:border-amber-400/80 focus:bg-white focus:ring-4 focus:ring-amber-200/40"
            />
            {cancerOpen && filteredCancerTypes.length > 0 ? (
              <ul
                id={cancerListId}
                role="listbox"
                className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-lg shadow-stone-900/10"
              >
                {filteredCancerTypes.map((opt, index) => (
                  <li key={opt.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={cancerType === opt.value}
                      className={`flex w-full px-4 py-2.5 text-left text-sm transition ${
                        index === highlightedCancerIndex
                          ? 'bg-amber-50 text-stone-900'
                          : 'text-stone-700 hover:bg-stone-50'
                      }`}
                      onMouseEnter={() => setActiveCancerIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCancer(opt.value)}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {cancerType === 'other' ? (
            <div className="space-y-2">
              <label
                htmlFor={`${formId}-other-cancer`}
                className="block text-sm font-medium text-stone-800"
              >
                Please describe your cancer type
              </label>
              <input
                id={`${formId}-other-cancer`}
                type="text"
                value={otherCancerDetail}
                onChange={(e) => {
                  setOtherCancerDetail(e.target.value)
                  if (otherCancerError && e.target.value.trim() !== '') {
                    setOtherCancerError(false)
                  }
                }}
                placeholder="e.g. pancreatic, ovarian…"
                aria-invalid={otherCancerError}
                className={`w-full rounded-2xl border bg-stone-50/80 px-4 py-3 text-stone-900 shadow-inner shadow-stone-900/5 outline-none transition placeholder:text-stone-400 focus:bg-white focus:ring-4 ${
                  otherCancerError
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200/50'
                    : 'border-stone-200 focus:border-amber-400/80 focus:ring-amber-200/40'
                }`}
              />
              {otherCancerError ? (
                <p className="text-xs text-rose-600" role="alert">
                  Add a short description so we can tailor support for you.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor={`${formId}-stage`}
              className="block text-sm font-medium text-stone-800"
            >
              Stage
            </label>
            <select
              id={`${formId}-stage`}
              value={stage}
              onChange={(e) =>
                setStage(e.target.value as (typeof STAGES)[number]['value'] | '')
              }
              className="w-full cursor-pointer appearance-none rounded-2xl border border-stone-200 bg-stone-50/80 bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat px-4 py-3 pr-11 text-stone-900 outline-none transition focus:border-amber-400/80 focus:bg-white focus:ring-4 focus:ring-amber-200/40"
              style={{ backgroundImage: selectChevron }}
            >
              <option value="">Select stage</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${formId}-age`}
              className="block text-sm font-medium text-stone-800"
            >
              Age
            </label>
            <p className="text-xs text-stone-500">Optional.</p>
            <input
              id={`${formId}-age`}
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 45"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400/80 focus:bg-white focus:ring-4 focus:ring-amber-200/40"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${formId}-sex`}
              className="block text-sm font-medium text-stone-800"
            >
              Sex assigned at birth
            </label>
            <select
              id={`${formId}-sex`}
              value={sexAssignedAtBirth}
              onChange={(e) =>
                setSexAssignedAtBirth(e.target.value as SexAssignedValue | '')
              }
              className="w-full cursor-pointer appearance-none rounded-2xl border border-stone-200 bg-stone-50/80 bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat px-4 py-3 pr-11 text-stone-900 outline-none transition focus:border-amber-400/80 focus:bg-white focus:ring-4 focus:ring-amber-200/40"
              style={{ backgroundImage: selectChevron }}
            >
              <option value="">Select</option>
              {SEX_ASSIGNED_AT_BIRTH.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-6 rounded-2xl border border-stone-100 bg-stone-50/60 px-4 py-5 sm:px-5 sm:py-6">
            <legend className="px-1 text-sm font-medium text-stone-800">
              A few details
            </legend>

            <ToggleRow
              id={`${formId}-prior`}
              label="I have had prior cancer treatment"
              description="Chemotherapy, radiation, surgery, or similar."
              pressed={priorCancerTreatment}
              onPressedChange={setPriorCancerTreatment}
            />

            <div className="border-t border-stone-200/80 pt-5">
              <p
                id={`${formId}-onc-label`}
                className="text-sm font-medium text-stone-800"
              >
                Have you met with your oncologist yet?{' '}
                <span className="font-normal text-rose-500">*</span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                We ask so we can match you with the right next steps.
              </p>
              <div
                className="mt-3 flex flex-wrap gap-3"
                role="radiogroup"
                aria-labelledby={`${formId}-onc-label`}
              >
                <YesNoPill
                  id={`${formId}-onc-yes`}
                  selected={metWithOncologist === 'yes'}
                  onSelect={() => {
                    setMetWithOncologist('yes')
                    setOncologistError(false)
                  }}
                  label="Yes"
                />
                <YesNoPill
                  id={`${formId}-onc-no`}
                  selected={metWithOncologist === 'no'}
                  onSelect={() => {
                    setMetWithOncologist('no')
                    setOncologistError(false)
                  }}
                  label="No"
                />
              </div>
              {oncologistError ? (
                <p className="mt-2 text-xs text-rose-600" role="alert">
                  Please choose yes or no to continue.
                </p>
              ) : null}
            </div>

            <div className="border-t border-stone-200/80 pt-6">
              <label
                htmlFor={`${formId}-anxiety`}
                className="block text-base font-medium tracking-tight text-stone-800"
              >
                What are you most anxious about?
              </label>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                Whatever is on your mind is okay here — there is no wrong
                answer.
              </p>
              <textarea
                id={`${formId}-anxiety`}
                name="mainAnxiety"
                value={mainAnxiety}
                onChange={(e) => setMainAnxiety(e.target.value)}
                rows={6}
                placeholder="You can share as much or as little as you'd like"
                className="mt-4 w-full resize-y rounded-3xl border border-rose-200/50 bg-gradient-to-br from-rose-50/90 via-amber-50/40 to-stone-50/80 px-5 py-4 text-[0.95rem] leading-relaxed text-stone-800 shadow-inner shadow-rose-900/5 outline-none transition placeholder:text-stone-400/90 focus:border-amber-300/80 focus:bg-gradient-to-br focus:from-white focus:via-rose-50/50 focus:to-amber-50/30 focus:shadow-md focus:shadow-amber-900/5 focus:ring-4 focus:ring-amber-200/35"
              />
            </div>
          </fieldset>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-b from-amber-600 to-amber-700 px-5 py-3.5 text-base font-semibold text-white shadow-md shadow-amber-900/20 transition hover:from-amber-500 hover:to-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 active:translate-y-px"
            >
              Continue
            </button>
            <p className="mt-3 text-center text-xs text-stone-500">
              By continuing you acknowledge this is a demo and no data is stored
              or sent anywhere.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

type ToggleRowProps = {
  id: string
  label: string
  description: string
  pressed: boolean
  onPressedChange: (next: boolean) => void
}

function ToggleRow({
  id,
  label,
  description,
  pressed,
  onPressedChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-stone-800">
          {label}
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={pressed}
        onClick={() => onPressedChange(!pressed)}
        className={`relative h-8 w-14 shrink-0 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
          pressed
            ? 'border-amber-500 bg-amber-500'
            : 'border-stone-300 bg-stone-200/80'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${
            pressed ? 'translate-x-6' : 'translate-x-0'
          }`}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  )
}

type YesNoPillProps = {
  id: string
  selected: boolean
  onSelect: () => void
  label: string
}

function YesNoPill({ id, selected, onSelect, label }: YesNoPillProps) {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`min-w-[5.5rem] rounded-2xl border px-5 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
        selected
          ? 'border-amber-500 bg-amber-100/90 text-amber-950 shadow-sm shadow-amber-900/10'
          : 'border-stone-200/90 bg-white/90 text-stone-700 hover:border-amber-200 hover:bg-amber-50/50'
      }`}
    >
      {label}
    </button>
  )
}
