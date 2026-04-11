import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { SystemInfo } from '../../../src/types/SystemInfo'
import { GlobalTallySource, ProducerBundle, ProducerId } from '../../../src/tally/types/ProducerStates'
import { ConsumerExportMap } from '../../../src/tally/TallyLifecycle'
import { UITallyDevice } from '../types/DeviceStates'
import { DeviceAddress, DeviceAlertState, DeviceAlertTarget } from '../../../src/tally/types/ConsumerStates'
import { DEFAULT_UI_ALERT_CONFIG, UIAlertSlot } from '../../../src/types/UIStates'
import { UIConfig } from '../types/UIStates'
import { ProducerConfig } from '../../../src/tally/producer/AbstractTallyProducer'
import { ConsumerId } from '../types/beacon'
import { ConsumerConfig } from '../../../src/tally/consumer/AbstractConsumer'
// import * as api from '../api/beacon'
// import type {
//   ProducerEntry,
//   ConsumersState,
//   UIDevice,
//   AlertSlot,
//   AppSettings,
//   GlobalTallySource,
// } from '../types/beacon'
// import {
//   DEFAULT_SETTINGS,
//   DEFAULT_ALERT_CONFIG,
//   stateFromValue,
// } from '../types/beacon'


// ? Helpers
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

// ? Context Data Shape

interface BeaconState {
    // producers: ProducerEntry[]
    // consumers: ConsumersState
    // devices: UIDevice[]
    // settings: AppSettings
    // settingsDirty: boolean
    // loading: boolean
    // error: string | null

    // ? Reimplemented:
    producers: ProducerBundle[];
    consumers: ConsumerExportMap | {};
    devices: UITallyDevice[]; // TODO: Map by producer?

    system: SystemInfo;

    uiConfig: UIConfig;

    // settings: AppSettings // TODO CHECK IF NEEDED OR DIRECT UPDATE / LOAD
    settingsUnsaved: boolean

    loading: boolean;
    error: string | null;
    
    // mutations
    refresh: () => void

    addProducer: (type: string, config: ProducerConfig) => Promise<void>
    removeProducer: (id: ProducerId) => Promise<void>
    updateProducer: (id: ProducerId, config: ProducerConfig) => Promise<void>

    setConsumerEnabled: (id: 'gpio' | 'aedes', enabled: boolean) => Promise<void>
    updateConsumer: (id: ConsumerId, config: ConsumerConfig) => Promise<void>

    patchDevice: (device: DeviceAddress, patch: GlobalTallySource[]) => Promise<void>
    renameDevice: (device: DeviceAddress, name: { short: string; long: string }) => Promise<void>
    removeDevice: (device: DeviceAddress) => Promise<void>
    sendAlert: (device: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget) => Promise<void>

    updateAlertSlot: (index: number, slot: UIAlertSlot) => Promise<void>
    resetAlertSlot: (index: number) => Promise<void>

    saveSettings: () => Promise<void>
    discardSettings: () => void

    exportConfig: () => Promise<void>
    importConfig: (file: File) => Promise<void>
}

const BeaconContext = createContext<BeaconState | null>(null)

// ? Provider
export function BeaconProvider({ children }: { children: ReactNode }) {
      const [producers, setProducers] = useState<ProducerBundle[]>([])
      const [consumers, setConsumers] = useState<ConsumerExportMap | {}>({})
      const [devices, setDevices]     = useState<UITallyDevice[]>([])
      const [system, setSystem]     = useState<SystemInfo>({})
      const [uiConfig, setUiConfig]     = useState<UIConfig>({
        alerts: DEFAULT_UI_ALERT_CONFIG
      })
    //   const [settings, setSettings]   = useState<AppSettings>(DEFAULT_SETTINGS)
    //   const [saved, setSaved]         = useState<AppSettings>(DEFAULT_SETTINGS)
    //   const [settingsDirty, setDirty] = useState(false)
      const [loading, setLoading]     = useState(true)
      const [error, setError]         = useState<string | null>(null)
    
    const fetchAll = useCallback(async () => {
        // try {
        //   const [prods, cons] = await Promise.all([
        //     api.getProducers(),
        //     api.getConsumers(),
        //   ])
        //   setProducers(prods)
        //   setConsumers(cons)
        
        //   // Devices endpoint may not exist yet — handle gracefully
        //   try {
        //     const rawDevices = await api.getDevices()
        //     const ui: UIDevice[] = []
        //     for (const [consumerId, devList] of Object.entries(rawDevices)) {
        //       for (const dev of devList) {
        //         ui.push({
        //           key: `${dev.id.consumer}:${dev.id.device}`,
        //           long: dev.name?.long ?? `${dev.id.consumer} ${dev.id.device}`,
        //           short: dev.name?.short ?? dev.id.device,
        //           consumerId: consumerId as 'gpio' | 'aedes',
        //           consumerName: CONSUMER_NAMES[consumerId] ?? consumerId,
        //           connectionLabel: CONNECTION_LABELS[dev.connection] ?? 'Unknown',
        //           patch: dev.patch,
        //           state: stateFromValue(dev.state),
        //           lastUpdate: formatTs(dev.last_update),
        //         })
        //       }
        //     }
        //     setDevices(ui)
        //   } catch {
        //     // /api/devices not yet available — use empty list
        //     setDevices([])
        //   }
        
        //   setError(null)
        // } catch (e) {
        //   setError(e instanceof Error ? e.message : 'Failed to load data')
        // } finally {
        //   setLoading(false)
        // }
    }, [])
    
    useEffect(() => { fetchAll() }, [fetchAll])
    
    
    const addProducer = async (type: string, config: ProducerConfig) => {
      return;
    }
    const removeProducer = async (id: ProducerId) => {
      return;
    }
    const updateProducer = async (id: ProducerId, config: ProducerConfig) => {
      return;
    }


    
    const setConsumerEnabled = async (id: 'gpio' | 'aedes', enabled: boolean) => {
      return;
    }
    const updateConsumer = async (id: ConsumerId, config: ConsumerConfig) => {
      return;
    }

    
    const patchDevice = async (device: DeviceAddress, patch: GlobalTallySource[]) => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }
    const renameDevice = async (device: DeviceAddress, name: { short: string; long: string }) => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }
    const removeDevice = async (device: DeviceAddress) => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }
    const sendAlert = async (device: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget) => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }

    const updateAlertSlot = async (index: number, slot: UIAlertSlot) => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }
    const resetAlertSlot = async (index: number) => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }

    const saveSettings = async () => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }
    const discardSettings = () => {
      return;
    }

    const exportConfig = async () => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }
    const importConfig = async (file: File) => {
      return new Promise<void>(resolve => setTimeout(resolve, 200));
    }

    // // Poll for tally state updates every 2 seconds
    // useEffect(() => {
    //     const id = setInterval(() => {
    //         setDevices(prev => prev.map(d => ({ ...d, lastUpdate: formatTs(undefined) })))
    //         // In production, poll /api/devices here for live state
    //     }, 2000)
    //     return () => clearInterval(id)
    // }, [])
    
    // const removeProducer = async (id: string) => {
    //     await api.removeProducer(id)
    //     setProducers(prev => prev.filter(p => p.config.id !== id))
    // }
    
    // const setConsumerEnabled = async (id: 'gpio' | 'aedes', enabled: boolean) => {
    //     await api.updateConsumer(id, { enabled })
    //     setConsumers(prev => ({ ...prev, [id]: { ...prev[id], enabled } }))
    //     updateSettings({ consumers: { ...settings.consumers, [id]: enabled } })
    // }
    
    // const patchDevice = async (key: string, patch: GlobalTallySource[]) => {
    //     const [consumer, ...rest] = key.split(':')
    //     const device = rest.join(':')
    //     await api.patchDevice(consumer, device, patch)
    //     setDevices(prev => prev.map(d => d.key === key ? { ...d, patch } : d))
    // }
    
    // const renameDevice = async (key: string, name: { short: string; long: string }) => {
    //     const [consumer, ...rest] = key.split(':')
    //     const device = rest.join(':')
    //     await api.renameDevice(consumer, device, name)
    //     setDevices(prev => prev.map(d =>
    //         d.key === key ? { ...d, long: name.long, short: name.short } : d
    //     ))
    // }
    
    // const sendAlert = async (key: string, type: string, target: string) => {
    //     const [consumer, ...rest] = key.split(':')
    //     const device = rest.join(':')
    //     await api.sendAlert(consumer, device, type, target)
    // }
    
    // const updateSettings = (partial: Partial<AppSettings>) => {
    //     setSettings(prev => ({ ...prev, ...partial }))
    //     setDirty(true)
    // }
    
    // const updateAlertSlot = (index: number, slot: AlertSlot) => {
    //     setSettings(prev => {
    //         const alertConfig = [...prev.alertConfig]
    //         alertConfig[index] = slot
    //         return { ...prev, alertConfig }
    //     })
    //     setDirty(true)
    // }
    
    // const resetAlertSlot = (index: number) => {
    //     setSettings(prev => {
    //         const alertConfig = [...prev.alertConfig]
    //         alertConfig[index] = { ...DEFAULT_ALERT_CONFIG[index] }
    //         return { ...prev, alertConfig }
    //     })
    //     setDirty(true)
    // }
    
    // const saveSettings = async () => {
    //     // Persist consumer toggles to backend
    //     await Promise.all(
    //         (['gpio', 'aedes'] as const).map(id =>
    //             api.updateConsumer(id, { enabled: settings.consumers[id] })
    //         )
    //     )
    //     setSaved(settings)
    //     setDirty(false)
    // }
    
    // const discardSettings = () => {
    //     setSettings(saved)
    //     setDirty(false)
    // }
    
    // const exportConfig = async () => {
    //     const config = await api.exportConfig()
    //     const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    //     const url  = URL.createObjectURL(blob)
    //     const a    = Object.assign(document.createElement('a'), { href: url, download: 'beacon-config.json' })
    //     a.click()
    //     URL.revokeObjectURL(url)
    // }
    
    // const importConfig = async (file: File) => {
    //     const text = await file.text()
    //     const config = JSON.parse(text)
    //     await api.importConfig(config)
    //     await fetchAll()
    // }

    return (
        <BeaconContext value={{
            producers: producers, consumers: consumers, devices: devices, 
            system: system, uiConfig: uiConfig,
            // settings, 
            settingsUnsaved: false, 
            loading: loading, error: error,
            refresh: fetchAll,
            addProducer: addProducer, removeProducer: removeProducer, updateProducer: removeProducer,
            setConsumerEnabled: setConsumerEnabled, updateConsumer: updateConsumer,
            patchDevice: patchDevice, renameDevice: renameDevice, removeDevice: removeDevice, sendAlert: sendAlert,
            updateAlertSlot: updateAlertSlot, resetAlertSlot: resetAlertSlot,
            saveSettings: saveSettings, discardSettings: discardSettings,
            exportConfig: exportConfig, importConfig: importConfig,
        }}>
        {children}
        </BeaconContext>
    )   
}



// ? Hook

export function useBeacon(): BeaconState {
  const ctx = useContext(BeaconContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}