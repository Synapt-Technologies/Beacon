import { useState, useEffect } from 'react'
import mqtt from 'mqtt'
import { useBeacon } from '../context/BeaconContext'
import type { AedesConsumerConfig } from '../../../src/tally/consumer/networkConsumer/AedesNetworkConsumer'

type SourceState = 'pgm' | 'pvw' | 'none'

export interface TallyStateResult {
  states: Map<string, SourceState>
  connected: boolean
}

export function useTallyState(): TallyStateResult {
  const { consumers } = useBeacon()
  const wsPort = (consumers.aedes?.config as Partial<AedesConsumerConfig> | undefined)?.ws_port ?? 9001
  const wsUrl  = `ws://${window.location.hostname}:${wsPort}`

  const [states, setStates]     = useState<Map<string, SourceState>>(new Map())
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const client = mqtt.connect(wsUrl)

    client.on('connect', () => {
      setConnected(true)
      client.subscribe('tally/global')
    })

    client.on('message', (_topic, payload) => {
      try {
        const data = JSON.parse(payload.toString()) as {
          program?: string[]
          preview?: string[]
        }
        const next = new Map<string, SourceState>()
        data.program?.forEach(key => next.set(key, 'pgm'))
        data.preview?.forEach(key => { if (!next.has(key)) next.set(key, 'pvw') })
        setStates(next)
      } catch {
        // malformed payload — ignore
      }
    })

    client.on('disconnect', () => setConnected(false))
    client.on('error',      () => setConnected(false))

    return () => { client.end() }
  }, [wsUrl])

  return { states, connected }
}
