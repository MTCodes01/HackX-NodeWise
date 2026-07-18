// ============================================================
// Factory API Service — FastAPI backend abstraction
// Falls back to DEMO MODE gracefully when backend is unavailable
// ============================================================

const API_BASE = (import.meta as { env: Record<string, string> }).env?.VITE_API_URL ?? 'http://localhost:8000'
const TIMEOUT_MS = 3000

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timer)
    return response
  } catch {
    clearTimeout(timer)
    throw new Error('Request failed or timed out')
  }
}

export interface TelemetryPayload {
  timestamp: string
  machine_id: string
  line_id: string
  vibration: number
  temperature: number
  rpm: number
  power_kw: number
}

/** Send live telemetry to backend. Returns true on success. */
export async function sendTelemetry(payload: TelemetryPayload): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Fetch factory state snapshot from backend */
export async function getFactoryState(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/factory/state`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Fetch all incidents */
export async function getIncidents(): Promise<unknown[] | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/incidents`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Request a Gemini recommendation for an incident */
export async function requestRecommendation(incidentId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/incidents/${incidentId}/recommend`, {
      method: 'POST',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Check backend connectivity. Returns true if backend is reachable. */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
