import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import * as api from '../api/beacon'
import type {
  ProducerEntry,
  ConsumersState,
  UIDevice,
  AlertSlot,
  AppSettings,
  GlobalTallySource,
} from '../types/beacon'
import {
  DEFAULT_SETTINGS,
  DEFAULT_ALERT_CONFIG,
  stateFromValue,
} from '../types/beacon'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONNECTION_LABELS: Record<number, string> = {
  0: 'Hardware',
  1: 'Network',
  2: 'Wireless',
  3: 'Virtual',
}

const CONSUMER_NAMES: Record<string, string> = {
  gpio:  'GPIO hardware',
  aedes: 'MQTT broker',
}

function formatTs(ms?: number): string {
  if (!ms) return '—'
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 5)  return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}

// ─── Context shape ───────────────────────────────────────────────────────────

interface AppState {
  producers: ProducerEntry[]
  consumers: ConsumersState
  devices: UIDevice[]
  settings: AppSettings
  settingsDirty: boolean
  loading: boolean
  error: string | null

  // mutations
  refresh: () => void
  removeProducer: (id: string) => Promise<void>
  setConsumerEnabled: (id: 'gpio' | 'aedes', enabled: boolean) => Promise<void>
  patchDevice: (key: string, patch: GlobalTallySource[]) => Promise<void>
  renameDevice: (key: string, name: { short: string; long: string }) => Promise<void>
  sendAlert: (key: string, type: string, target: string) => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => void
  updateAlertSlot: (index: number, slot: AlertSlot) => void
  resetAlertSlot: (index: number) => void
  saveSettings: () => Promise<void>
  discardSettings: () => void
  exportConfig: () => Promise<void>
  importConfig: (file: File) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [producers, setProducers] = useState<ProducerEntry[]>([])
  const [consumers, setConsumers] = useState<ConsumersState>({})
  const [devices, setDevices]     = useState<UIDevice[]>([])
  const [settings, setSettings]   = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved]         = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsDirty, setDirty] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [prods, cons] = await Promise.all([
        api.getProducers(),
        api.getConsumers(),
      ])
      setProducers(prods)
      setConsumers(cons)

      // Devices endpoint may not exist yet — handle gracefully
      try {
        const rawDevices = await api.getDevices()
        const ui: UIDevice[] = []
        for (const [consumerId, devList] of Object.entries(rawDevices)) {
          for (const dev of devList) {
            ui.push({
              key: `${dev.id.consumer}:${dev.id.device}`,
              long: dev.name?.long ?? `${dev.id.consumer} ${dev.id.device}`,
              short: dev.name?.short ?? dev.id.device,
              consumerId: consumerId as 'gpio' | 'aedes',
              consumerName: CONSUMER_NAMES[consumerId] ?? consumerId,
              connectionLabel: CONNECTION_LABELS[dev.connection] ?? 'Unknown',
              patch: dev.patch,
              state: stateFromValue(dev.state),
              lastUpdate: formatTs(dev.last_update),
            })
          }
        }
        setDevices(ui)
      } catch {
        // /api/devices not yet available — use empty list
        setDevices([])
      }

      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Poll for tally state updates every 2 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setDevices(prev => prev.map(d => ({ ...d, lastUpdate: formatTs(undefined) })))
      // In production, poll /api/devices here for live state
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const removeProducer = async (id: string) => {
    await api.removeProducer(id)
    setProducers(prev => prev.filter(p => p.config.id !== id))
  }

  const setConsumerEnabled = async (id: 'gpio' | 'aedes', enabled: boolean) => {
    await api.updateConsumer(id, { enabled })
    setConsumers(prev => ({ ...prev, [id]: { ...prev[id], enabled } }))
    updateSettings({ consumers: { ...settings.consumers, [id]: enabled } })
  }

  const patchDevice = async (key: string, patch: GlobalTallySource[]) => {
    const [consumer, ...rest] = key.split(':')
    const device = rest.join(':')
    await api.patchDevice(consumer, device, patch)
    setDevices(prev => prev.map(d => d.key === key ? { ...d, patch } : d))
  }

  const renameDevice = async (key: string, name: { short: string; long: string }) => {
    const [consumer, ...rest] = key.split(':')
    const device = rest.join(':')
    await api.renameDevice(consumer, device, name)
    setDevices(prev => prev.map(d =>
      d.key === key ? { ...d, long: name.long, short: name.short } : d
    ))
  }

  const sendAlert = async (key: string, type: string, target: string) => {
    const [consumer, ...rest] = key.split(':')
    const device = rest.join(':')
    await api.sendAlert(consumer, device, type, target)
  }

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }))
    setDirty(true)
  }

  const updateAlertSlot = (index: number, slot: AlertSlot) => {
    setSettings(prev => {
      const alertConfig = [...prev.alertConfig]
      alertConfig[index] = slot
      return { ...prev, alertConfig }
    })
    setDirty(true)
  }

  const resetAlertSlot = (index: number) => {
    setSettings(prev => {
      const alertConfig = [...prev.alertConfig]
      alertConfig[index] = { ...DEFAULT_ALERT_CONFIG[index] }
      return { ...prev, alertConfig }
    })
    setDirty(true)
  }

  const saveSettings = async () => {
    // Persist consumer toggles to backend
    await Promise.all(
      (['gpio', 'aedes'] as const).map(id =>
        api.updateConsumer(id, { enabled: settings.consumers[id] })
      )
    )
    setSaved(settings)
    setDirty(false)
  }

  const discardSettings = () => {
    setSettings(saved)
    setDirty(false)
  }

  const exportConfig = async () => {
    const config = await api.exportConfig()
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'beacon-config.json' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = async (file: File) => {
    const text = await file.text()
    const config = JSON.parse(text)
    await api.importConfig(config)
    await fetchAll()
  }

  return (
    <AppContext value={{
      producers, consumers, devices, settings, settingsDirty, loading, error,
      refresh: fetchAll,
      removeProducer, setConsumerEnabled,
      patchDevice, renameDevice, sendAlert,
      updateSettings, updateAlertSlot, resetAlertSlot,
      saveSettings, discardSettings,
      exportConfig, importConfig,
    }}>
      {children}
    </AppContext>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}