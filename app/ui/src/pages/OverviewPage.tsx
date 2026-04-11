import { useState } from 'react'
import { useBeacon } from '../context/BeaconContext'
import DeviceRow from '../components/devices/DeviceRow'
import { DeviceDetailOverlay } from '../components/DeviceDetailOverlay'
import { UITallyDevice } from '../types/DeviceStates'
import { GlobalDeviceTools } from '../../../src/tally/types/ConsumerStates'

export default function OverviewPage() {
  const { devices } = useBeacon()
  const [selected, setSelected] = useState<UITallyDevice | null>(null)

  const consumerCount = new Set(devices.map(d => d.id.consumer)).size

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} across {consumerCount} consumer{consumerCount !== 1 ? 's' : ''}
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
        <DeviceRow
          key={GlobalDeviceTools.create(device.id.consumer, device.id.device)}
          device={device}
          setSelected={setSelected}
        />
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
