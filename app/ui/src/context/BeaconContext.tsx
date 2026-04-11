import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import * as api from '../api/BeaconApi'
import { SystemInfo } from '../../../src/types/SystemInfo'
import { GlobalTallySource, ProducerBundle, ProducerId } from '../../../src/tally/types/ProducerStates'
import { ConsumerExportMap } from '../../../src/tally/TallyLifecycle'
import { UITallyDevice } from '../types/DeviceStates'
import { DeviceAddress, DeviceAlertState, DeviceAlertTarget } from '../../../src/tally/types/ConsumerStates'
import { DEFAULT_UI_ALERT_CONFIG, UIAlertSlot, UIConfig } from '../../../src/types/UIStates'
import { ProducerConfig } from '../../../src/tally/producer/AbstractTallyProducer'
import { ConsumerId } from '../types/beacon'
import { ConsumerConfig } from '../../../src/tally/consumer/AbstractConsumer'


// ? Helpers
const CONSUMER_NAMES: Record<string, string> = {
  gpio:  'GPIO hardware',
  aedes: 'MQTT broker',
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
    const [system]                  = useState<SystemInfo>({})
    const [uiConfig, setUiConfig]   = useState<UIConfig>({ alerts: DEFAULT_UI_ALERT_CONFIG })
    const [settingsUnsaved, setSettingsUnsaved] = useState(false)
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState<string | null>(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)
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
            const ui: UITallyDevice[] = []
            for (const [consumerId, devList] of Object.entries(rawDevices)) {
              for (const dev of devList) {
                ui.push({
                  ...dev,
                  consumer: { name: CONSUMER_NAMES[consumerId] ?? consumerId },
                })
              }
            }
            setDevices(ui)
          } catch {
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


    // ? Producers — no add/update endpoints yet
    const addProducer = async (_type: string, _config: ProducerConfig) => {
      // TODO: POST /api/producers not yet implemented on server
    }
    const removeProducer = async (id: ProducerId) => {
      await api.removeProducer(id)
      setProducers(prev => prev.filter(p => p.config.id !== id))
    }
    const updateProducer = async (_id: ProducerId, _config: ProducerConfig) => {
      // TODO: PATCH /api/producers/:id not yet implemented on server
    }

    // ? Consumers
    const setConsumerEnabled = async (id: ConsumerId, enabled: boolean) => {
      await api.patchConsumer(id, { enabled })
      setConsumers(prev => ({
        ...prev,
        [id]: { ...prev[id as keyof ConsumerExportMap], enabled },
      }))
    }
    const updateConsumer = async (id: ConsumerId, config: ConsumerConfig) => {
      await api.patchConsumer(id, { config })
      setConsumers(prev => ({
        ...prev,
        [id]: { ...prev[id as keyof ConsumerExportMap], config: { ...prev[id as keyof ConsumerExportMap]?.config, ...config } },
      }))
    }

    // ? Devices
    const patchDevice = async (device: DeviceAddress, patch: GlobalTallySource[]) => {
      await api.patchDevice(device, patch)
      setDevices(prev => prev.map(d =>
        d.id.consumer === device.consumer && d.id.device === device.device
          ? { ...d, patch }
          : d
      ))
    }
    const renameDevice = async (device: DeviceAddress, name: { short: string; long: string }) => {
      await api.renameDevice(device, name)
      setDevices(prev => prev.map(d =>
        d.id.consumer === device.consumer && d.id.device === device.device
          ? { ...d, name }
          : d
      ))
    }
    const removeDevice = async (device: DeviceAddress) => {
      // TODO: DELETE /api/devices/:consumer/:device not yet implemented on server
      setDevices(prev => prev.filter(d =>
        !(d.id.consumer === device.consumer && d.id.device === device.device)
      ))
    }
    const sendAlert = async (device: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget) => {
      await api.sendAlert(device, type, target)
    }

    // ? Alert slots — local only, no server endpoint yet
    const updateAlertSlot = async (index: number, slot: UIAlertSlot) => {
      setUiConfig(prev => {
        const alerts = [...prev.alerts]
        alerts[index] = slot
        return { ...prev, alerts }
      })
      setSettingsUnsaved(true)
    }
    const resetAlertSlot = async (index: number) => {
      setUiConfig(prev => {
        const alerts = [...prev.alerts]
        alerts[index] = DEFAULT_UI_ALERT_CONFIG[index]
        return { ...prev, alerts }
      })
      setSettingsUnsaved(true)
    }

    // ? Settings — no server endpoint yet
    const saveSettings = async () => {
      // TODO: persist uiConfig to server
      setSettingsUnsaved(false)
    }
    const discardSettings = () => {
      // TODO: reload uiConfig from server
      setSettingsUnsaved(false)
    }

    // ? Config
    const exportConfig = async () => {
      await api.exportConfig()
    }
    const importConfig = async (file: File) => {
      const text = await file.text()
      const config = JSON.parse(text)
      await api.importConfig(config)
      await fetchAll()
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
