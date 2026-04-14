import { useState } from 'react'
import { UITallyDevice } from '../../types/DeviceStates'
import type { GlobalTallySource, SourceInfo } from '../../../../src/tally/types/ProducerStates'
import { useBeacon } from '../../context/BeaconContext'

// ? Consumer-specific config sections
// Add a case here when a consumer type gets configurable device fields.

function ConsumerConfigSection({ device }: { device: UITallyDevice }) {
  switch (device.id.consumer) {
    case 'gpio':
      return (
        <Section label="GPIO config">
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>
            Pin configuration not yet supported
          </div>
        </Section>
      )
    case 'aedes':
      return null // No per-device MQTT config yet
    default:
      return null
  }
}

// ? Shared section wrapper

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{
        fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '.06em',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ? Props

export interface DeviceEditModalProps {
  device:   UITallyDevice
  open:     boolean
  onSave:   (name: { short?: string; long: string }) => void
  onPatch:  () => void
  onRemove: () => void
  onClose:  () => void
}

// ? Component

export function DeviceEditModal({ device, open, onSave, onPatch, onRemove, onClose }: DeviceEditModalProps) {
  const [short, setShort] = useState(device.name.short ?? '')
  const [long,  setLong]  = useState(device.name.long)
  const { producers } = useBeacon()

  if (!open) return null

  const patch = device.patch

  function shortName(producer: string, source: string): string {
    const key = `${producer}:${source}`
    for (const p of producers) {
      const sources = p.info?.sources as unknown as Record<string, SourceInfo>
      if (sources?.[key]) return sources[key].short ?? source
    }
    return source
  }

  const handleSave = () => {
    onSave({ long, short: short || undefined })
  }

  const handleRemove = () => {
    if (confirm(`Remove ${device.name.long}?`)) onRemove()
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 25,
        background: 'rgba(0,0,0,.35)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 28,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--color-background-primary)',
        borderRadius: 'var(--border-radius-lg)',
        width: 520,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '0.5px solid var(--color-border-tertiary)',
      }}>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Edit device
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {device.consumer.name} · {device.id.device}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 16px 12px' }}>

          {/* Name */}
          <Section label="Name">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Long (display name)">
                <input
                  className="pf-input"
                  value={long}
                  onChange={e => setLong(e.target.value)}
                  placeholder={device.id.device}
                />
              </Field>
              <Field label="Short (abbreviated)">
                <input
                  className="pf-input"
                  value={short}
                  onChange={e => setShort(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </Section>

          {/* Patch */}
          <Section label="Source patch">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 30 }}>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {patch.length === 0 ? (
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>No sources patched</span>
                ) : (
                  patch.slice(0, 8).map((src: GlobalTallySource, i: number) => (
                    <span key={i} style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 99,
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-secondary)',
                      border: '0.5px solid var(--color-border-tertiary)',
                    }}>
                      {shortName(src.producer, src.source)}
                    </span>
                  ))
                )}
                {patch.length > 8 && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99,
                    background: 'var(--color-background-secondary)',
                    color: 'var(--color-text-tertiary)',
                    border: '0.5px solid var(--color-border-tertiary)',
                  }}>
                    +{patch.length - 8}
                  </span>
                )}
              </div>
              <button className="sm-btn" onClick={onPatch} style={{ flexShrink: 0 }}>
                Edit patch
              </button>
            </div>
          </Section>

          {/* Consumer-specific config */}
          <ConsumerConfigSection device={device} />

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px',
          borderTop: '0.5px solid var(--color-border-tertiary)',
        }}>
          <button
            onClick={handleRemove}
            style={{
              fontSize: 12, padding: '5px 12px',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid color-mix(in srgb, var(--pgm) 35%, transparent)',
              background: 'none', color: 'var(--pgm)', cursor: 'pointer',
            }}
          >
            Remove
          </button>
          <div style={{ flex: 1 }} />
          <button className="sm-btn" onClick={onClose}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!long.trim()}
            style={{
              fontSize: 12, padding: '5px 14px',
              borderRadius: 'var(--border-radius-md)', border: 'none',
              background: 'var(--acc)', color: '#fff', cursor: 'pointer',
              opacity: long.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>

      </div>
    </div>
  )
}
