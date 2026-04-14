import { useState, useEffect } from 'react'
import mqtt from 'mqtt'
import { useBeacon } from '../context/BeaconContext'
import type { AedesConsumerConfig } from '../../../src/tally/consumer/networkConsumer/AedesNetworkConsumer'
import { DeviceTallyDisplayName, GlobalDeviceTools } from '../../../src/tally/types/ConsumerStates'
import type { DeviceDisplayState } from '../types/beacon'

type SourceState = 'pgm' | 'pvw' | 'none'

export interface TallyStateResult {
  states: Map<string, SourceState>
  deviceStates: Map<string, DeviceDisplayState>
  connected: boolean
}

export function useTallyState(): TallyStateResult {
  const { consumers } = useBeacon()
  const wsPort    = (consumers.aedes?.config as Partial<AedesConsumerConfig> | undefined)?.ws_port ?? 9001
  const consumerId = (consumers.aedes?.config as Partial<AedesConsumerConfig> | undefined)?.id ?? 'aedes'
  const wsUrl     = `ws://${window.location.hostname}:${wsPort}`

  const [states,       setStates]       = useState<Map<string, SourceState>>(new Map())
  const [deviceStates, setDeviceStates] = useState<Map<string, DeviceDisplayState>>(new Map())
  const [connected,    setConnected]    = useState(false)

  useEffect(() => {
    const client = mqtt.connect(wsUrl)

    client.on('connect', () => {
      setConnected(true)
      client.subscribe('tally/global')
      client.subscribe('tally/device/+')
    })

    client.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString())

        if (topic === 'tally/global') {
          const next = new Map<string, SourceState>()
          ;(data as { program?: string[] }).program?.forEach(key => next.set(key, 'pgm'))
          ;(data as { preview?: string[] }).preview?.forEach(key => { if (!next.has(key)) next.set(key, 'pvw') })
          setStates(next)
        } else if (topic.startsWith('tally/device/')) {
          const rawDeviceId = topic.slice('tally/device/'.length)
          const name        = (data as { state?: string }).state ?? ''
          const display     = (DeviceTallyDisplayName[name as keyof typeof DeviceTallyDisplayName] ?? 'none') as DeviceDisplayState
          const fullKey     = GlobalDeviceTools.create(consumerId, rawDeviceId)
          setDeviceStates(prev => new Map(prev).set(fullKey, display))
        }
      } catch {
        // malformed payload — ignore
      }
    })

    client.on('disconnect', () => setConnected(false))
    client.on('error',      () => setConnected(false))

    return () => { client.end() }
  }, [wsUrl, consumerId])

  return { states, deviceStates, connected }
}
