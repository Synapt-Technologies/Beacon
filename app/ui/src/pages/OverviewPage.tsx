import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { DeviceDetailOverlay } from '../components/DeviceDetailOverlay'
import type { UIDevice } from '../types/beacon'
import DeviceRow from '../components/devices/DeviceRow'
import { useBeacon } from '../context/BeaconContext'

export default function OverviewPage() {
  const { devices } = useBeacon()
  const [selected, setSelected] = useState<UIDevice | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} across{' '}
          {new Set(devices.map(d => d.consumerId)).size} consumers
        </span>
      </div>

      {devices.length === 0 && (
        <div style={{
          padding: '32px 0', textAlign: 'center',
          fontSize: 13, color: 'var(--color-text-tertiary)',
        }}>
          No devices found — configure consumers and check connections
        </div>
      )}

      {devices.map(device => (
        <DeviceRow device={device} setSelected={setSelected}/>
      ))}

      {selected && (
        <DeviceDetailOverlay
          device={selected}
          backLabel="Overview"
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}