import { useNavigate, useParams } from 'react-router-dom'
import { useBeacon } from '../context/BeaconContext'
import DeviceRow from '../components/devices/DeviceRow'
import { DeviceDetailOverlay } from '../components/deviceDetail/DeviceDetailOverlay'
import { GlobalDeviceTools } from '../../../src/tally/types/ConsumerStates'

export default function DevicesPage() {
  const navigate = useNavigate()
  const { consumer, device: deviceId } = useParams()
  const { devices } = useBeacon()

  const consumerCount  = new Set(devices.map(d => d.id.consumer)).size
  const selectedDevice = consumer && deviceId
    ? devices.find(d => d.id.consumer === consumer && d.id.device === deviceId)
    : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, height: '25px' }}>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} across {consumerCount} consumer{consumerCount !== 1 ? 's' : ''}
        </span>
      </div>

      {devices.length === 0 && (
        <div style={{
          padding: '32px 0', textAlign: 'center',
          fontSize: 13, color: 'var(--color-text-tertiary)',
        }}>
          No devices found
        </div>
      )}

      {devices.map(device => (
        <DeviceRow
          key={GlobalDeviceTools.create(device.id.consumer, device.id.device)}
          device={device}
          onSelect={() => navigate(`/devices/${device.id.consumer}/${device.id.device}`)}
        />
      ))}

      {selectedDevice && (
        <DeviceDetailOverlay
          device={selectedDevice}
          backPath="/devices"
          backLabel="Devices"
        />
      )}
    </div>
  )
}
