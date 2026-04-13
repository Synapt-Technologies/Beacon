import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { toast } from 'react-hot-toast'
import * as api from '../api/BeaconApi'
import { SystemInfo } from '../../../src/types/SystemInfo'
import { GlobalTallySource, ProducerBundle, ProducerId } from '../../../src/tally/types/ProducerStates'
import { ConsumerExportMap, type OrchestratorConfig, type LifecycleConfig } from '../../../src/tally/TallyLifecycle'
import { UITallyDevice } from '../types/DeviceStates'
import { DeviceAddress, DeviceAlertState, DeviceAlertTarget } from '../../../src/tally/types/ConsumerStates'
import { DEFAULT_UI_ALERT_CONFIG, UIAlertSlot, UIConfig } from '../../../src/types/UIStates'
import { ProducerConfig } from '../../../src/tally/producer/AbstractTallyProducer'
import { ConsumerId } from '../types/beacon'
import { ConsumerConfig } from '../../../src/tally/consumer/AbstractConsumer'
import { CONSUMER_META } from '../config/consumers'

// ? Context Data Shape

interface BeaconState {
    producers: ProducerBundle[];
    consumers: Partial<ConsumerExportMap>;
    devices: UITallyDevice[];

    system: SystemInfo;
    uiConfig: UIConfig;

    orchestratorConfig: Partial<OrchestratorConfig>

    loading: boolean;
    error: string | null;

    // mutations
    refresh: () => void

    addProducer: (type: string, config: ProducerConfig & Record<string, unknown>) => Promise<void>
    removeProducer: (id: ProducerId) => Promise<void>
    updateProducer: (id: ProducerId, config: ProducerConfig & Record<string, unknown>) => Promise<void>

    updateOrchestratorConfig: (config: Partial<OrchestratorConfig>) => Promise<void>

    setConsumerEnabled: (id: ConsumerId, enabled: boolean) => Promise<void>
    updateConsumer: (id: ConsumerId, config: ConsumerConfig) => Promise<void>

    patchDevice: (device: DeviceAddress, patch: GlobalTallySource[]) => Promise<void>
    renameDevice: (device: DeviceAddress, name: { short?: string; long: string }) => Promise<void>
    removeDevice: (device: DeviceAddress) => Promise<void>
    sendAlert: (device: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget) => Promise<void>

    updateAlertSlot: (index: number, slot: UIAlertSlot) => void
    resetAlertSlot: (index: number) => void

    exportConfig: () => Promise<void>
    importConfig: (file: File) => Promise<void>
}

const BeaconContext = createContext<BeaconState | null>(null)

// ? Provider
export function BeaconProvider({ children }: { children: ReactNode }) {
    const [producers, setProducers]                   = useState<ProducerBundle[]>([])
    const [consumers, setConsumers]                   = useState<Partial<ConsumerExportMap>>({})
    const [devices, setDevices]                       = useState<UITallyDevice[]>([])
    const [orchestratorConfig, setOrchestratorConfig] = useState<Partial<OrchestratorConfig>>({})
    const [system, setSystem]                          = useState<SystemInfo>({})
    const [uiConfig, setUiConfig]                     = useState<UIConfig>({ alerts: DEFAULT_UI_ALERT_CONFIG })
    const [loading, setLoading]                       = useState(false)
    const [error, setError]                           = useState<string | null>(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
          const [prods, cons, orchConfig] = await Promise.all([
            api.getProducers(),
            api.getConsumers(),
            api.getOrchestratorConfig(),
          ])
          setProducers(prods)
          setConsumers(cons)
          setOrchestratorConfig(orchConfig)

          try {
            const rawDevices = await api.getDevices()
            const ui: UITallyDevice[] = []
            for (const [consumerId, devList] of Object.entries(rawDevices)) {
              for (const dev of devList) {
                ui.push({
                  ...dev,
                  consumer: { name: CONSUMER_META[consumerId as keyof typeof CONSUMER_META]?.name ?? consumerId },
                })
              }
            }
            setDevices(ui)
          } catch {
            setDevices([])
          }

          const sys = await api.getSystemInfo();
          setSystem(sys);

          setError(null)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load data')
        } finally {
          setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    // ? Producers
    const addProducer = async (type: string, config: ProducerConfig & Record<string, unknown>) => {
      try {
        await api.addProducer(type, config)
        await fetchAll()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to add connection') ; throw e }
    }
    const removeProducer = async (id: ProducerId) => {
      try {
        await api.removeProducer(id)
        setProducers(prev => prev.filter(p => p.config.id !== id))
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to remove connection') ; await fetchAll() ; throw e }
    }
    const updateProducer = async (id: ProducerId, config: ProducerConfig & Record<string, unknown>) => {
      const prod = producers.find(p => p.config.id === id)
      if (!prod) return
      try {
        await api.updateProducer(id, prod.type, config)
        await fetchAll()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to update connection') ; throw e }
    }

    // ? Orchestrator
    const updateOrchestratorConfig = async (config: Partial<OrchestratorConfig>) => {
      try {
        await api.updateOrchestratorConfig(config)
        setOrchestratorConfig(prev => ({ ...prev, ...config }))
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save settings') ; await fetchAll() ; throw e }
    }

    // ? Consumers
    const setConsumerEnabled = async (id: ConsumerId, enabled: boolean) => {
      try {
        await api.patchConsumer(id, { enabled })
        setConsumers(prev => ({
          ...prev,
          [id]: { ...prev[id as keyof ConsumerExportMap], enabled },
        }))
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to update consumer') ; await fetchAll() ; throw e }
    }
    const updateConsumer = async (id: ConsumerId, config: ConsumerConfig) => {
      try {
        await api.patchConsumer(id, { config })
        setConsumers(prev => ({
          ...prev,
          [id]: { ...prev[id as keyof ConsumerExportMap], config: { ...prev[id as keyof ConsumerExportMap]?.config, ...config } },
        }))
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save settings') ; await fetchAll() ; throw e }
    }

    // ? Devices
    const patchDevice = async (device: DeviceAddress, patch: GlobalTallySource[]) => {
      try {
        await api.patchDevice(device, patch)
        setDevices(prev => prev.map(d =>
          d.id.consumer === device.consumer && d.id.device === device.device
            ? { ...d, patch }
            : d
        ))
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to patch device') ; await fetchAll() ; throw e }
    }
    const renameDevice = async (device: DeviceAddress, name: { short?: string; long: string }) => {
      try {
        await api.renameDevice(device, name)
        setDevices(prev => prev.map(d =>
          d.id.consumer === device.consumer && d.id.device === device.device
            ? { ...d, name }
            : d
        ))
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to rename device') ; await fetchAll() ; throw e }
    }
    const removeDevice = async (device: DeviceAddress) => {
      try {
        await api.removeDevice(device)
        setDevices(prev => prev.filter(d =>
          !(d.id.consumer === device.consumer && d.id.device === device.device)
        ))
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to remove device') ; await fetchAll() ; throw e }
    }
    const sendAlert = async (device: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget) => {
      try {
        await api.sendAlert(device, type, target)
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to send alert') ; throw e }
    }

    // ? Alert slots — applied immediately, no pending state
    const updateAlertSlot = (index: number, slot: UIAlertSlot) => {
      setUiConfig(prev => {
        const alerts = [...prev.alerts]
        alerts[index] = slot
        return { ...prev, alerts }
      })
    }
    const resetAlertSlot = (index: number) => {
      setUiConfig(prev => {
        const alerts = [...prev.alerts]
        alerts[index] = DEFAULT_UI_ALERT_CONFIG[index]
        return { ...prev, alerts }
      })
    }

    // ? Config
    const exportConfig = async () => {
      await api.exportConfig()
    }
    const importConfig = async (file: File) => {
      let config: unknown
      try {
        config = JSON.parse(await file.text())
      } catch {
        setError('Invalid config file — could not parse JSON')
        return
      }
      await api.importConfig(config as LifecycleConfig)
      await fetchAll()
    }

    return (
        <BeaconContext value={{
            producers, consumers, devices,
            orchestratorConfig,
            system, uiConfig,
            loading, error,
            refresh: fetchAll,
            addProducer, removeProducer, updateProducer,
            updateOrchestratorConfig,
            setConsumerEnabled, updateConsumer,
            patchDevice, renameDevice, removeDevice, sendAlert,
            updateAlertSlot, resetAlertSlot,
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
