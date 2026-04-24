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
import { HardwareVersion, SystemInfo } from '../../../src/types/SystemInfo'
import type { ProducerBundle, ProducerId } from '../../../src/tally/types/ProducerTypes'
import type { GlobalSource } from '../../../src/tally/types/SourceTypes'
import { ConsumerExportMap, type OrchestratorConfig, type LifecycleConfig } from '../../../src/tally/TallyLifecycle'
import { UITallyDevice } from '../types/DeviceStates'
import { DeviceAddress, DeviceAlertAction, DeviceAlertTarget } from '../../../src/tally/types/DeviceTypes'
import { DEFAULT_UI_ALERT_CONFIG, UIAlertSlot, UIConfig } from '../../../src/types/UIStates'
import { ProducerConfig } from '../../../src/tally/producer/AbstractTallyProducer'
import { ConsumerId } from '../types/beacon'
import { ConsumerConfig } from '../../../src/tally/consumer/AbstractConsumer'
import { CONSUMER_META } from '../config/consumers'
import { WebHaptics, defaultPatterns } from "web-haptics";

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
    setProducerEnabled: (id: ProducerId, enabled: boolean) => Promise<void>

    updateOrchestratorConfig: (config: Partial<OrchestratorConfig>) => Promise<void>

    setConsumerEnabled: (id: ConsumerId, enabled: boolean) => Promise<void>
    updateConsumer: <T extends ConsumerConfig>(id: ConsumerId, config: Partial<T>) => Promise<void>

    patchDevice: (device: DeviceAddress, patch: GlobalSource[]) => Promise<void>
    renameDevice: (device: DeviceAddress, name: { short?: string; long: string }) => Promise<void>
    removeDevice: (device: DeviceAddress) => Promise<void>
    sendAlert: (device: DeviceAddress, type: DeviceAlertAction, target: DeviceAlertTarget, time: number) => Promise<void>

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
    const [uiConfig, setUIConfig]                      = useState<UIConfig>({ alerts: DEFAULT_UI_ALERT_CONFIG })
    const [system, setSystem]                          = useState<SystemInfo>({ hardware: HardwareVersion.UNKNOWN })
    const [loading, setLoading]                       = useState(false)
    const [error, setError]                           = useState<string | null>(null)

    const haptics = new WebHaptics();

    const applySSEPayload = useCallback((s: any) => {
        setProducers(s.producers ?? [])
        setConsumers(s.consumers ?? {})
        setOrchestratorConfig(s.orchestratorConfig ?? {})
        if (s.uiConfig) setUIConfig(s.uiConfig)
        const ui: UITallyDevice[] = []
        for (const [consumerId, devList] of Object.entries(s.devices ?? {})) {
          for (const dev of devList as UITallyDevice[]) {
            ui.push({
              ...dev,
              consumer: { name: CONSUMER_META[consumerId as keyof typeof CONSUMER_META]?.name ?? consumerId },
            })
          }
        }
        setDevices(ui)
        setSystem(s.info ?? {})
        setError(null)
        setLoading(false)
    }, [])

    useEffect(() => {
        setLoading(true)
        const es = new EventSource('/api/events')
        es.onmessage = (e) => applySSEPayload(JSON.parse(e.data))
        es.onerror = () => setError('Lost connection to server')
        return () => es.close()
    }, [applySSEPayload])

    // ? Producers
    const addProducer = async (type: string, config: ProducerConfig & Record<string, unknown>) => {
      await toast.promise(
        api.addProducer(type, config),
        {
          loading: 'Adding connection…',
          success: 'Connection added',
          error:   (e: unknown) => e instanceof Error ? e.message : 'Failed to add connection',
        }
      )
    }
    const removeProducer = async (id: ProducerId) => {
      await toast.promise(
        api.removeProducer(id).then(() => setProducers(prev => prev.filter(p => p.config.id !== id))),
        { loading: 'Removing connection…', success: 'Connection removed', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to remove connection' }
      )
    }
    const setProducerEnabled = async (id: ProducerId, enabled: boolean) => {
      await toast.promise(
        api.setProducerEnabled(id, enabled).then(() => setProducers(prev => prev.map(p =>
          p.config.id === id ? { ...p, enabled } : p
        ))),
        { loading: enabled ? 'Enabling…' : 'Disabling…', success: enabled ? 'Producer enabled' : 'Producer disabled', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to update producer' }
      )
    }
    const updateProducer = async (id: ProducerId, config: ProducerConfig & Record<string, unknown>) => {
      const prod = producers.find(p => p.config.id === id)
      if (!prod) return
      await toast.promise(
        api.updateProducer(id, prod.type, config),
        { loading: 'Saving connection…', success: 'Connection updated', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to update connection' }
      )
    }

    // ? Orchestrator
    const updateOrchestratorConfig = async (config: Partial<OrchestratorConfig>) => {
      await toast.promise(
        api.updateOrchestratorConfig(config).then(() => setOrchestratorConfig(prev => ({ ...prev, ...config }))),
        { loading: 'Saving…', success: 'Settings saved', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to save settings' }
      )
    }

    // ? Consumers
    const setConsumerEnabled = async (id: ConsumerId, enabled: boolean) => {
      await toast.promise(
        api.patchConsumer(id, { enabled }).then(() => setConsumers(prev => ({
          ...prev,
          [id]: { ...prev[id as keyof ConsumerExportMap], enabled },
        }))),
        { loading: enabled ? 'Enabling…' : 'Disabling…', success: enabled ? 'Consumer enabled' : 'Consumer disabled', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to update consumer' }
      )
    }
    const updateConsumer = async <T extends ConsumerConfig>(id: ConsumerId, config: Partial<T>) => {
      await toast.promise(
        api.patchConsumer(id, { config }).then(() => setConsumers(prev => ({
          ...prev,
          [id]: { ...prev[id as keyof ConsumerExportMap], config: { ...prev[id as keyof ConsumerExportMap]?.config, ...config } },
        }))),
        { loading: 'Saving…', success: 'Settings saved', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to save settings' }
      )
    }

    // ? Devices
    const patchDevice = async (device: DeviceAddress, patch: GlobalSource[]) => {
      await toast.promise(
        api.patchDevice(device, patch).then(() => setDevices(prev => prev.map(d =>
          d.id.consumer === device.consumer && d.id.device === device.device ? { ...d, patch } : d
        ))),
        { loading: 'Saving…', success: 'Device updated', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to patch device' }
      )
    }
    const renameDevice = async (device: DeviceAddress, name: { short?: string; long: string }) => {
      await toast.promise(
        api.renameDevice(device, name).then(() => setDevices(prev => prev.map(d =>
          d.id.consumer === device.consumer && d.id.device === device.device ? { ...d, name } : d
        ))),
        { loading: 'Renaming…', success: 'Device renamed', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to rename device' }
      )
    }
    const removeDevice = async (device: DeviceAddress) => {
      await toast.promise(
        api.removeDevice(device).then(() => setDevices(prev => prev.filter(d =>
          !(d.id.consumer === device.consumer && d.id.device === device.device)
        ))),
        { loading: 'Removing…', success: 'Device removed', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to remove device' }
      )
    }
    const sendAlert = async (device: DeviceAddress, type: DeviceAlertAction, target: DeviceAlertTarget, time: number) => {
      haptics.trigger(defaultPatterns.heavy)
      await toast.promise(
        api.sendAlert(device, type, target, time),
        { loading: 'Sending alert…', success: 'Alert sent', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to send alert' }
      )
    }

    // ? UI config
    const updateUIConfig = async (config: Partial<UIConfig>) => {
      await toast.promise(
        api.updateUIConfig(config).then(() => setUIConfig(prev => ({ ...prev, ...config }))),
        { loading: 'Saving…', success: 'Settings saved', error: (e: unknown) => e instanceof Error ? e.message : 'Failed to save settings' }
      )
    }

    // ? Alert slots
    const updateAlertSlot = (index: number, slot: UIAlertSlot) => {
      const alerts = [...uiConfig.alerts]
      alerts[index] = slot
      updateUIConfig({ alerts }).catch(() => {})
    }
    const resetAlertSlot = (index: number) => {
      const alerts = [...uiConfig.alerts]
      alerts[index] = DEFAULT_UI_ALERT_CONFIG[index]
      updateUIConfig({ alerts }).catch(() => {})
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
    }

    return (
        <BeaconContext value={{
            producers, consumers, devices,
            orchestratorConfig,
            system, uiConfig,
            loading, error,
            refresh: () => {},
            addProducer, removeProducer, updateProducer, setProducerEnabled,
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
