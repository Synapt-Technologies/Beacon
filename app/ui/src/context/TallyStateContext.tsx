import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import mqtt from 'mqtt'
import { useBeacon } from './BeaconContext'
import type { AedesConsumerConfig } from '../../../src/tally/consumer/networkConsumer/AedesNetworkConsumer'
import { DeviceTallyDisplayName, DeviceAddressDto } from '../../../src/tally/types/DeviceTypes'
import type { DeviceDisplayState } from '../types/beacon'

type SourceState = 'pgm' | 'pvw' | 'none'

export interface TallyStateResult {
  states: Map<string, SourceState>
  deviceStates: Map<string, DeviceDisplayState>
  connected: boolean
  systemConnected: boolean
}

const TallyStateContext = createContext<TallyStateResult | null>(null)

export function TallyStateProvider({ children }: { children: ReactNode }) {
  const { consumers } = useBeacon()
  const aedesCfg    = consumers.aedes?.config as Partial<AedesConsumerConfig> | undefined
  const wsPort      = aedesCfg?.ws_port        ?? 9001
  const keepAliveMs = aedesCfg?.keep_alive_ms  ?? 500
  const wsUrl       = `ws://${window.location.hostname}:${wsPort}`

  const [states,        setStates]        = useState<Map<string, SourceState>>(new Map())
  const [deviceStates,  setDeviceStates]  = useState<Map<string, DeviceDisplayState>>(new Map())
  const [connected,     setConnected]     = useState(false)
  const [initialized,   setInitialized]   = useState(false)
  const [lastKeepalive, setLastKeepalive] = useState<number | null>(null)
  const [stale,         setStale]         = useState(false)

  useEffect(() => {
    let cancelled = false
    const client = mqtt.connect(wsUrl)

    client.on('connect', () => {
      if (cancelled) return
      setConnected(true)
      setInitialized(true)
      client.subscribe('tally/global')
      client.subscribe('tally/device/+/+')
      client.subscribe('tally/device/+')
      client.subscribe('system/info')
    })

    client.on('message', (topic, payload) => {
      if (cancelled) return
      try {
        const data = JSON.parse(payload.toString())

        if (topic === 'tally/global') {
          const next = new Map<string, SourceState>()
          ;(data as { program?: string[] }).program?.forEach(key => next.set(key, 'pgm'))
          ;(data as { preview?: string[] }).preview?.forEach(key => { if (!next.has(key)) next.set(key, 'pvw') })
          setStates(next)
        } else if (topic.startsWith('tally/device/')) {
          const deviceAddress = topic.slice('tally/device/'.length).split('/')
          if (deviceAddress.length != 2) {
            console.warn(`Received device update with invalid topic: ${topic}`)
            return
          }
          
          const consumerId = deviceAddress[0]
          const deviceId = deviceAddress[1]
          console.log(`Received device update for ${consumerId}/${deviceId}`)

          const name        = (data as { state?: string }).state ?? ''
          const display     = (DeviceTallyDisplayName[name as keyof typeof DeviceTallyDisplayName] ?? 'none') as DeviceDisplayState
          const fullKey     = new DeviceAddressDto(consumerId, deviceId).toKey()
          setDeviceStates(prev => new Map(prev).set(fullKey, display))
        } else if (topic === 'system/info') {
          setLastKeepalive(Date.now())
          setStale(false)
        }
      } catch {
        // malformed payload — ignore
      }
    })

    const setDisconnected = () => { if (!cancelled) setConnected(false) }
    client.on('disconnect', setDisconnected)
    client.on('close',      setDisconnected)
    client.on('offline',    setDisconnected)
    client.on('error',      setDisconnected)

    return () => {
      cancelled = true
      client.end()
    }
  }, [wsUrl, keepAliveMs])

  // Staleness detection: flag if no keepalive received within keepAliveMs * 5
  useEffect(() => {
    const id = setInterval(() => {
      if (lastKeepalive === null) return
      setStale(Date.now() - lastKeepalive > keepAliveMs * 5)
    }, keepAliveMs)
    return () => clearInterval(id)
  }, [keepAliveMs, lastKeepalive])

  // Before the first successful connect, assume healthy so the toast doesn't fire on page load
  const value: TallyStateResult = {
    states,
    deviceStates,
    connected,
    systemConnected: !initialized || (connected && !stale),
  }

  return <TallyStateContext value={value}>{children}</TallyStateContext>
}

export function useTallyState(): TallyStateResult {
  const ctx = useContext(TallyStateContext)
  if (!ctx) throw new Error('useTallyState must be used within TallyStateProvider')
  return ctx
}
