import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

const CANCER_TYPES = [
  { value: 'lung', label: 'Lung cancer' },
  { value: 'prostate', label: 'Prostate cancer' },
  // { value: 'other', label: 'Other / not listed' },
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

type FormErrorKey =
  | 'cancerType'
  | 'stage'
  | 'age'
  | 'sex'
  | 'priorTreatment'
  | 'oncologist'

type FormErrors = Partial<Record<FormErrorKey, string>>

export type PatientIntakePayload = {
  cancerType: CancerTypeValue
  cancerTypeLabel: string | null
  otherCancerDetail: string | null
  stage: (typeof STAGES)[number]['value']
  stageLabel: string | null
  age: number
  sexAssignedAtBirth: SexAssignedValue
  sexAssignedAtBirthLabel: string | null
  priorCancerTreatment: 'yes' | 'no'
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

function validateAgeInput(raw: string): string | undefined {
  const t = raw.trim()
  if (t === '') return 'Please enter your age.'
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n))
    return 'Use a whole number for age.'
  if (n < 1 || n > 120) return 'Please enter an age between 1 and 120.'
  return undefined
}

/** SVG chevron stroke ~ violet-700 #6d28d9 */
const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236d28d9'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`

const fieldRing =
  'focus:border-violet-500/80 focus:bg-white focus:ring-4 focus:ring-violet-300/45'
const fieldRingError =
  'border-rose-400 focus:border-rose-500 focus:ring-rose-200/55'

/** Matches cancer-type combobox: border, radius, fill, type scale, padding, shadow, focus */
const fieldShellBase =
  'w-full min-w-0 rounded-2xl border bg-stone-50/80 px-4 py-3 text-base leading-normal text-stone-900 shadow-inner shadow-stone-900/5 outline-none transition placeholder:text-stone-400'

const numberInputNoSpin =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const selectChevronLayout =
  'cursor-pointer appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-11'

function fieldShellClassName(hasError: boolean): string {
  return `${fieldShellBase} ${
    hasError
      ? `border-rose-400 ${fieldRingError}`
      : `border-stone-200 ${fieldRing}`
  }`
}

type PatientIntakeFormProps = {
  onSubmitSuccess?: (payload: PatientIntakePayload) => void | Promise<void>
}

export function PatientIntakeForm({ onSubmitSuccess }: PatientIntakeFormProps) {
  const formId = useId()
  const cancerListId = `${formId}-cancer-list`
  const cancerFieldId = `${formId}-cancer`
  const err = {
    cancer: `${formId}-err-cancer`,
    stage: `${formId}-err-stage`,
    age: `${formId}-err-age`,
    sex: `${formId}-err-sex`,
    prior: `${formId}-err-prior`,
    onc: `${formId}-err-onc`,
  } as const

  const [cancerType, setCancerType] = useState<CancerTypeValue | ''>('')
  const [cancerQuery, setCancerQuery] = useState('')
  const [cancerOpen, setCancerOpen] = useState(false)
  const [activeCancerIndex, setActiveCancerIndex] = useState(0)

  const [stage, setStage] = useState<(typeof STAGES)[number]['value'] | ''>(
    '',
  )
  const [age, setAge] = useState('')
  const [sexAssignedAtBirth, setSexAssignedAtBirth] = useState<
    SexAssignedValue | ''
  >('')

  const [priorCancerTreatment, setPriorCancerTreatment] = useState<
    'yes' | 'no' | ''
  >('')
  const [metWithOncologist, setMetWithOncologist] = useState<'yes' | 'no' | ''>(
    '',
  )
  const [mainAnxiety, setMainAnxiety] = useState('')

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const comboboxRef = useRef<HTMLDivElement>(null)

  const clearFieldError = useCallback((key: FormErrorKey) => {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

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
    clearFieldError('cancerType')
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

  function runValidation(): FormErrors {
    const next: FormErrors = {}

    if (!cancerType) {
      next.cancerType = 'Please choose a cancer type from the list.'
    }

    if (!stage) {
      next.stage = 'Please select a stage.'
    }

    const ageErr = validateAgeInput(age)
    if (ageErr) next.age = ageErr

    if (!sexAssignedAtBirth) {
      next.sex = 'Please select an option.'
    }

    if (priorCancerTreatment !== 'yes' && priorCancerTreatment !== 'no') {
      next.priorTreatment = 'Please choose yes or no to continue.'
    }

    if (metWithOncologist !== 'yes' && metWithOncologist !== 'no') {
      next.oncologist = 'Please choose yes or no to continue.'
    }

    return next
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const next = runValidation()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const payload: PatientIntakePayload = {
      cancerType: cancerType as CancerTypeValue,
      cancerTypeLabel: findCancerLabel(cancerType),
      otherCancerDetail: null,
      stage: stage as (typeof STAGES)[number]['value'],
      stageLabel: findStageLabel(stage),
      age: Number(age.trim()),
      sexAssignedAtBirth: sexAssignedAtBirth as SexAssignedValue,
      sexAssignedAtBirthLabel: findSexAssignedLabel(sexAssignedAtBirth),
      priorCancerTreatment: priorCancerTreatment as 'yes' | 'no',
      metWithOncologist: metWithOncologist as 'yes' | 'no',
      mainAnxiety: mainAnxiety.trim() === '' ? null : mainAnxiety.trim(),
    }

    console.log('Patient intake (demo)', payload)
    setIsSubmitting(true)
    try {
      await onSubmitSuccess?.(payload)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancerErr = errors.cancerType
  const cancerInputClass = fieldShellClassName(Boolean(cancerErr))

  return (
    <div className="w-full min-w-0 lg:mx-auto lg:max-w-xl">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-400/35 bg-violet-100/90 px-4 py-3 shadow-sm shadow-violet-950/10 sm:gap-4">
        <img
          src="/color-full.png"
          alt=""
          className="h-9 w-auto shrink-0 object-contain object-left sm:h-10"
        />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-lg font-semibold leading-snug tracking-tight text-violet-950 sm:text-xl">
            Post-Diagnosis Form
          </p>
          <p className="mt-0.5 text-sm font-normal leading-snug text-violet-900/70">
            Feature Demo
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200/90 bg-white/90 p-6 shadow-xl shadow-violet-950/10 backdrop-blur-sm sm:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[1.65rem]">
            Tell us a bit about you
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-stone-600">
            This is only for you to understand your situation. It does not store or send any data to your care team.
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
              aria-invalid={Boolean(cancerErr)}
              aria-describedby={cancerErr ? err.cancer : undefined}
              autoComplete="off"
              value={
                cancerOpen
                  ? cancerQuery
                  : cancerType
                    ? (findCancerLabel(cancerType) ?? '')
                    : cancerQuery
              }
              onChange={(e) => {
                handleCancerInputChange(e.target.value)
                clearFieldError('cancerType')
              }}
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
              placeholder="e.g. lung, prostate…"
              className={cancerInputClass}
            />
            {cancerOpen && filteredCancerTypes.length > 0 ? (
              <ul
                id={cancerListId}
                role="listbox"
                className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-lg shadow-violet-950/15"
              >
                {filteredCancerTypes.map((opt, index) => (
                  <li key={opt.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={cancerType === opt.value}
                      className={`flex w-full px-4 py-2.5 text-left text-sm transition ${
                        index === highlightedCancerIndex
                          ? 'bg-violet-100 text-violet-950'
                          : 'text-stone-700 hover:bg-violet-50/80'
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
            {cancerErr ? (
              <p id={err.cancer} className="text-xs text-rose-600" role="alert">
                {cancerErr}
              </p>
            ) : null}
          </div>

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
              onChange={(e) => {
                setStage(e.target.value as (typeof STAGES)[number]['value'] | '')
                clearFieldError('stage')
              }}
              aria-invalid={Boolean(errors.stage)}
              aria-describedby={errors.stage ? err.stage : undefined}
              className={`${fieldShellClassName(Boolean(errors.stage))} ${selectChevronLayout}`}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              <option value="">Select stage</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.stage ? (
              <p id={err.stage} className="text-xs text-rose-600" role="alert">
                {errors.stage}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${formId}-age`}
              className="block text-sm font-medium text-stone-800"
            >
              Age
            </label>
            <input
              id={`${formId}-age`}
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={age}
              onChange={(e) => {
                setAge(e.target.value)
                clearFieldError('age')
              }}
              placeholder="e.g. 45"
              aria-invalid={Boolean(errors.age)}
              aria-describedby={errors.age ? err.age : undefined}
              className={`${fieldShellClassName(Boolean(errors.age))} ${numberInputNoSpin}`}
            />
            {errors.age ? (
              <p id={err.age} className="text-xs text-rose-600" role="alert">
                {errors.age}
              </p>
            ) : null}
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
              onChange={(e) => {
                setSexAssignedAtBirth(e.target.value as SexAssignedValue | '')
                clearFieldError('sex')
              }}
              aria-invalid={Boolean(errors.sex)}
              aria-describedby={errors.sex ? err.sex : undefined}
              className={`${fieldShellClassName(Boolean(errors.sex))} ${selectChevronLayout}`}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              <option value="">Select</option>
              {SEX_ASSIGNED_AT_BIRTH.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.sex ? (
              <p id={err.sex} className="text-xs text-rose-600" role="alert">
                {errors.sex}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-6 rounded-2xl border border-stone-100 bg-violet-50/25 px-4 py-5 sm:px-5 sm:py-6">
            <legend className="px-1 text-sm font-medium text-stone-800">
              A few details
            </legend>

            <div>
              <p
                id={`${formId}-prior-label`}
                className="text-sm font-medium text-stone-800"
              >
                Have you had cancer treatment?
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                For example chemotherapy, radiation, surgery, or similar.
              </p>
              <div
                className={`mt-3 flex flex-wrap gap-3 rounded-2xl p-1 ${
                  errors.priorTreatment
                    ? 'ring-2 ring-rose-300/90 ring-offset-2 ring-offset-violet-50/50'
                    : ''
                }`}
                role="radiogroup"
                aria-labelledby={`${formId}-prior-label`}
                aria-invalid={Boolean(errors.priorTreatment)}
                aria-describedby={
                  errors.priorTreatment ? err.prior : undefined
                }
              >
                <YesNoPill
                  id={`${formId}-prior-yes`}
                  selected={priorCancerTreatment === 'yes'}
                  onSelect={() => {
                    setPriorCancerTreatment('yes')
                    clearFieldError('priorTreatment')
                  }}
                  label="Yes"
                />
                <YesNoPill
                  id={`${formId}-prior-no`}
                  selected={priorCancerTreatment === 'no'}
                  onSelect={() => {
                    setPriorCancerTreatment('no')
                    clearFieldError('priorTreatment')
                  }}
                  label="No"
                />
              </div>
              {errors.priorTreatment ? (
                <p
                  id={err.prior}
                  className="mt-2 text-xs text-rose-600"
                  role="alert"
                >
                  {errors.priorTreatment}
                </p>
              ) : null}
            </div>

            <div className="border-t border-violet-200/40 pt-5">
              <p
                id={`${formId}-onc-label`}
                className="text-sm font-medium text-stone-800"
              >
                Have you met with your oncologist yet?
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                We ask so we can match you with the right next steps.
              </p>
              <div
                className={`mt-3 flex flex-wrap gap-3 rounded-2xl p-1 ${
                  errors.oncologist
                    ? 'ring-2 ring-rose-300/90 ring-offset-2 ring-offset-violet-50/50'
                    : ''
                }`}
                role="radiogroup"
                aria-labelledby={`${formId}-onc-label`}
                aria-invalid={Boolean(errors.oncologist)}
                aria-describedby={errors.oncologist ? err.onc : undefined}
              >
                <YesNoPill
                  id={`${formId}-onc-yes`}
                  selected={metWithOncologist === 'yes'}
                  onSelect={() => {
                    setMetWithOncologist('yes')
                    clearFieldError('oncologist')
                  }}
                  label="Yes"
                />
                <YesNoPill
                  id={`${formId}-onc-no`}
                  selected={metWithOncologist === 'no'}
                  onSelect={() => {
                    setMetWithOncologist('no')
                    clearFieldError('oncologist')
                  }}
                  label="No"
                />
              </div>
              {errors.oncologist ? (
                <p id={err.onc} className="mt-2 text-xs text-rose-600" role="alert">
                  {errors.oncologist}
                </p>
              ) : null}
            </div>

            <div className="border-t border-violet-200/40 pt-6">
              <label
                htmlFor={`${formId}-anxiety`}
                className="block text-base font-medium tracking-tight text-stone-800"
              >
                What are you most anxious about?
              </label>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                Whatever is on your mind is okay here. From treatment options to lifestyle changes, we're here to help. Optional.
              </p>
              <textarea
                id={`${formId}-anxiety`}
                name="mainAnxiety"
                value={mainAnxiety}
                onChange={(e) => setMainAnxiety(e.target.value)}
                rows={6}
                placeholder="You can share as much or as little as you'd like"
                className={`mt-4 w-full resize-y rounded-3xl border border-violet-200/55 bg-gradient-to-br from-violet-100/90 via-fuchsia-50/50 to-stone-50/85 px-5 py-4 text-[0.95rem] leading-relaxed text-stone-800 shadow-inner shadow-violet-950/10 outline-none transition placeholder:text-stone-400/90 ${fieldRing}`}
              />
            </div>
          </fieldset>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="cursor-pointer w-full rounded-2xl bg-gradient-to-b from-violet-800 to-violet-950 px-5 py-3.5 text-base font-semibold text-violet-50 shadow-md shadow-violet-950/35 transition hover:from-violet-700 hover:to-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
            >
              {isSubmitting ? 'Analyzing…' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
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
      className={`min-w-[5.5rem] rounded-2xl border px-5 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
        selected
          ? 'border-violet-700 bg-violet-200/90 text-violet-950 shadow-sm shadow-violet-950/15'
          : 'border-stone-200/90 bg-white/90 text-stone-700 hover:border-violet-300 hover:bg-violet-50/70'
      }`}
    >
      {label}
    </button>
  )
}
