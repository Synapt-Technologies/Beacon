import { useNavigate, useParams } from 'react-router-dom'
import { useBeacon } from '../context/BeaconContext'
import DeviceRow from '../components/devices/DeviceRow'
import { DeviceDetailOverlay } from '../components/deviceDetail/DeviceDetailOverlay'
import { DeviceAddressDto } from '../../../src/tally/types/DeviceTypes'

export default function OverviewPage() {
  const navigate = useNavigate()
  const { consumer, device: deviceId } = useParams()
  const { devices } = useBeacon()

  const consumerCount  = new Set(devices.map(d => d.id.consumer)).size
  const selectedDevice = consumer && deviceId
    ? devices.find(d => d.id.consumer === consumer && d.id.device === deviceId)
    : null

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
          key={DeviceAddressDto.from(device.id).toKey()}
          device={device}
          onSelect={() => navigate(`/overview/${device.id.consumer}/${device.id.device}`)}
        />
      ))}

      {selectedDevice && (
        <DeviceDetailOverlay
          device={selectedDevice}
          backPath="/overview"
          backLabel="Overview"
        />
      )}
    </div>
  )
}
