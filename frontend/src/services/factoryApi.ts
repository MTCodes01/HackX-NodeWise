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

export interface MachineTelemetryPayload {
  timestamp: string
  machine_id: string
  line_id: string
  vibration: number
  temperature: number
  rpm: number
  status: string
}

export interface EnergyTelemetryPayload {
  timestamp: string
  meter_id: string
  line_id: string
  power_kw: number
  energy_kwh: number
  current: number
  baseline_power: number
}

class TelemetrySocketManager {
  private static instance: TelemetrySocketManager;
  private ws: WebSocket | null = null;
  private listeners: ((data: any) => void)[] = [];
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): TelemetrySocketManager {
    if (!TelemetrySocketManager.instance) {
      TelemetrySocketManager.instance = new TelemetrySocketManager();
    }
    return TelemetrySocketManager.instance;
  }

  public connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
    this.isConnecting = true;
    
    // Fallback to localhost if API_BASE is relative or missing scheme
    let wsUrl = 'ws://localhost:8000/ws/telemetry';
    if (API_BASE.startsWith('http')) {
      wsUrl = API_BASE.replace('http', 'ws') + '/ws/telemetry';
    }
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          this.listeners.forEach(l => l(data));
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.ws = null;
      setTimeout(() => this.connect(), 5000); // Reconnect
    };
  }

  public onUpdate(callback: (data: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public send(type: string, payload: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    }
    // If disconnected, try to connect, and drop this packet.
    this.connect();
    return false;
  }
}

export const TelemetrySocket = TelemetrySocketManager.getInstance();

/** Send live machine telemetry to backend via WebSocket. Returns true on success. */
export async function sendMachineTelemetry(payload: MachineTelemetryPayload): Promise<boolean> {
  return TelemetrySocket.send('machine', payload);
}

/** Send live energy telemetry to backend via WebSocket. Returns true on success. */
export async function sendEnergyTelemetry(payload: EnergyTelemetryPayload): Promise<boolean> {
  return TelemetrySocket.send('energy', payload);
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
    const res = await fetchWithTimeout(`${API_BASE}/api/incidents`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Request a Gemini recommendation for an incident */
export async function requestRecommendation(incidentId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/recommendations/${incidentId}`, {
      method: 'GET',
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
    const res = await fetchWithTimeout(`${API_BASE}/`)
    return res.ok
  } catch {
    return false
  }
}

/** Fetch global UI state from backend */
export async function getSystemState(): Promise<Record<string, any> | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/system/state`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Register a new machine in the backend UI state */
export async function registerMachine(machine: any): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/machines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(machine),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Log a work order action in the backend UI state */
export async function logWorkOrder(action: 'create' | 'complete', data: any): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/maintenance/work-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    })
    return res.ok
  } catch {
    return false
  }
}
