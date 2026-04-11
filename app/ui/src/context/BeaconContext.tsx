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
import { DEFAULT_UI_ALERT_CONFIG, UIAlertSlot, UIConfig } from '../../../src/types/UIStates'
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


// ? Helpers — used in fetchAll once API is wired up
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
    producers: ProducerBundle[];
    consumers: Partial<ConsumerExportMap>;
    devices: UITallyDevice[]; // TODO: Map by producer?

    system: SystemInfo;

    uiConfig: UIConfig;

    settingsUnsaved: boolean

    loading: boolean;
    error: string | null;

    // mutations
    refresh: () => void

    addProducer: (type: string, config: ProducerConfig) => Promise<void>
    removeProducer: (id: ProducerId) => Promise<void>
    updateProducer: (id: ProducerId, config: ProducerConfig) => Promise<void>

    setConsumerEnabled: (id: ConsumerId, enabled: boolean) => Promise<void>
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
    const [consumers, setConsumers] = useState<Partial<ConsumerExportMap>>({})
    const [devices, setDevices]     = useState<UITallyDevice[]>([])
    const [system, setSystem]       = useState<SystemInfo>({})
    const [uiConfig, setUiConfig]   = useState<UIConfig>({ alerts: DEFAULT_UI_ALERT_CONFIG })
    const [settingsUnsaved, setSettingsUnsaved] = useState(false)
    const [loading, setLoading]     = useState(false)
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
        //           consumerId: consumerId as ConsumerId,
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

    const setConsumerEnabled = async (id: ConsumerId, enabled: boolean) => {
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

    return (
        <BeaconContext value={{
            producers, consumers, devices,
            system, uiConfig,
            settingsUnsaved,
            loading, error,
            refresh: fetchAll,
            addProducer, removeProducer, updateProducer,
            setConsumerEnabled, updateConsumer,
            patchDevice, renameDevice, removeDevice, sendAlert,
            updateAlertSlot, resetAlertSlot,
            saveSettings, discardSettings,
            exportConfig, importConfig,
        }}>
        {children}
        </BeaconContext>
    )
}



// ? Hook

export function useBeacon(): BeaconState {
  const ctx = useContext(BeaconContext)
  if (!ctx) throw new Error('useBeacon must be used within BeaconProvider')
  return ctx
}
