import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { DeviceDetailOverlay } from '../components/DeviceDetailOverlay'
import { IconChevronRight } from '../components/icons'
import type { UIDevice } from '../types/beacon'

export default function OverviewPage() {
  const { devices } = useApp()
  const [selected, setSelected] = useState<UIDevice | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} across{' '}
          {new Set(devices.map(d => d.consumerId)).size} consumers
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          click for detail
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
        <div
          key={device.key}
          className={`row-card tl-${device.state}`}
          onClick={() => setSelected(device)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {device.long}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {device.patch.length === 0 ? 'No sources patched' : device.patch.map(s => s.source).join(', ')}
            </div>
          </div>
          <span className="tag-pill">{device.consumerName}</span>
          <IconChevronRight style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        </div>
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