import type { ProducerEntry, ConsumersState, TallyDevice } from '../types/beacon'

const BASE = ''  // same-origin via vite-express

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Producers ───────────────────────────────────────────────────────────────

export const getProducers = () =>
  req<ProducerEntry[]>('/api/producers')

export const removeProducer = (id: string) =>
  req<void>(`/api/producers/${encodeURIComponent(id)}`, { method: 'DELETE' })

// ─── Consumers ───────────────────────────────────────────────────────────────

export const getConsumers = () =>
  req<ConsumersState>('/api/consumers')

export const updateConsumer = (
  id: 'gpio' | 'aedes',
  body: { enabled?: boolean; config?: Record<string, unknown> },
) => req<void>(`/api/consumers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

// ─── Devices (requires new endpoint in AdminServer.ts) ───────────────────────
//
//  Add to AdminServer._registerRoutes():
//
//    this.app.get('/api/devices', (_req, res) => {
//      const out: Record<string, TallyDevice[]> = {}
//      const orchestrator = this.orchestrator  // expose getDevices()
//      orchestrator.getDevices().forEach((devices, consumerId) => {
//        out[consumerId] = devices
//      })
//      res.json(out)
//    })
//
//    this.app.patch('/api/devices/:consumer/:device/patch', (req, res) => {
//      this.emit('patch_device', req.params, req.body)
//      res.status(204).send()
//    })
//
//    this.app.patch('/api/devices/:consumer/:device/name', (req, res) => {
//      this.emit('rename_device', req.params, req.body)
//      res.status(204).send()
//    })
//
//    this.app.post('/api/devices/:consumer/:device/alert', (req, res) => {
//      this.emit('send_alert', req.params, req.body)
//      res.status(204).send()
//    })

export const getDevices = () =>
  req<Record<string, TallyDevice[]>>('/api/devices')

export const patchDevice = (
  consumer: string,
  device: string,
  patch: Array<{ producer: string; source: string }>,
) =>
  req<void>(`/api/devices/${consumer}/${encodeURIComponent(device)}/patch`, {
    method: 'PATCH',
    body: JSON.stringify({ patch }),
  })

export const renameDevice = (
  consumer: string,
  device: string,
  name: { short: string; long: string },
) =>
  req<void>(`/api/devices/${consumer}/${encodeURIComponent(device)}/name`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })

export const sendAlert = (
  consumer: string,
  device: string,
  type: string,
  target: string,
) =>
  req<void>(`/api/devices/${consumer}/${encodeURIComponent(device)}/alert`, {
    method: 'POST',
    body: JSON.stringify({ type, target }),
  })

// ─── Config ──────────────────────────────────────────────────────────────────

export const exportConfig = () =>
  req<unknown>('/api/config/export')

export const importConfig = (config: unknown) =>
  req<void>('/api/config/import', { method: 'POST', body: JSON.stringify(config) })