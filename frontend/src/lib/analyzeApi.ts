import type { PatientIntakePayload } from '../features/intake/PatientIntakeForm.tsx'

export type AnalyzeApiRequest = {
  cancerType: string
  stage: string
  age?: number | null
  sex?: string | null
  hadPriorTreatment: boolean
  metOncologist: boolean
  anxiety?: string | null
}

export type WorkupStep = {
  title: string
  explanation: string
}

export type SuggestedQuestion = {
  question: string
  whyAsk: string
  whatItMeans: string
}

export type AnalyzeApiResponse = {
  diagnosis: string
  workup: WorkupStep[]
  questions: SuggestedQuestion[]
}

function mapPayloadToRequest(payload: PatientIntakePayload): AnalyzeApiRequest {
  return {
    cancerType: payload.cancerType,
    stage: payload.stage,
    age: payload.age,
    sex: payload.sexAssignedAtBirth,
    hadPriorTreatment: payload.priorCancerTreatment === 'yes',
    metOncologist: payload.metWithOncologist === 'yes',
    anxiety: payload.mainAnxiety,
  }
}

function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    try {
      return JSON.stringify(detail)
    } catch {
      return 'Validation error'
    }
  }
  if (detail && typeof detail === 'object' && 'detail' in detail) {
    return formatDetail((detail as { detail: unknown }).detail)
  }
  return 'Request failed'
}

/**
 * POST /api/analyze — uses Vite dev proxy to FastAPI unless VITE_API_BASE_URL is set.
 */
export async function postAnalyze(
  payload: PatientIntakePayload,
): Promise<AnalyzeApiResponse> {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  ) ?? ''
  const url = `${base}/api/analyze`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapPayloadToRequest(payload)),
  })

  const raw = await res.text()
  let parsed: unknown
  try {
    parsed = raw ? JSON.parse(raw) : {}
  } catch {
    throw new Error(raw || `Invalid response (${res.status})`)
  }

  if (!res.ok) {
    const body = parsed as { detail?: unknown }
    throw new Error(formatDetail(body.detail) || `Request failed (${res.status})`)
  }

  return parsed as AnalyzeApiResponse
}
