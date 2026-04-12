import { useState } from 'react'
import { UITallyDevice } from '../../types/DeviceStates'
import type { GlobalTallySource } from '../../../../src/tally/types/ProducerStates'

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
      return (
        <Section label="MQTT config">
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>
            Topic overrides not yet supported
          </div>
        </Section>
      )
    default:
      return null
  }
}

// ? Shared section wrapper

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
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

// ? Props

export interface DeviceEditPanelProps {
  device:    UITallyDevice
  onSave:    (name: { short: string; long: string }) => void
  onPatch:   () => void                   // opens the PatchModal at page level
  onRemove:  () => void
  onCancel:  () => void
}

// ? Component

export function DeviceEditPanel({ device, onSave, onPatch, onRemove, onCancel }: DeviceEditPanelProps) {
  const [short, setShort] = useState(device.name?.short ?? device.id.device)
  const [long,  setLong]  = useState(device.name?.long  ?? device.id.device)

  const patch = device.patch

  return (
    <div style={{
      padding: '14px 14px 12px',
      background: 'var(--color-background-secondary)',
      borderTop: '0.5px solid var(--color-border-tertiary)',
    }}>

      {/* Name section */}
      <Section label="Name">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Short">
            <input className="pf-input" value={short} onChange={e => setShort(e.target.value)} />
          </Field>
          <Field label="Long">
            <input className="pf-input" value={long} onChange={e => setLong(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Patch section */}
      <Section label="Source patch">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 30 }}>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {patch.length === 0 ? (
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>No sources patched</span>
            ) : (
              patch.slice(0, 6).map((src: GlobalTallySource, i: number) => (
                <span key={i} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 99,
                  background: 'var(--color-background-primary)',
                  color: 'var(--color-text-secondary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                }}>
                  {src.source}
                </span>
              ))
            )}
            {patch.length > 6 && (
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 99,
                background: 'var(--color-background-primary)',
                color: 'var(--color-text-tertiary)',
                border: '0.5px solid var(--color-border-tertiary)',
              }}>
                +{patch.length - 6}
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

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => { if (confirm(`Remove ${device.name?.long ?? device.id.device}?`)) onRemove() }}
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
        <button className="sm-btn" onClick={onCancel}>Cancel</button>
        <button
          onClick={() => onSave({ short, long })}
          style={{
            fontSize: 12, padding: '5px 14px',
            borderRadius: 'var(--border-radius-md)', border: 'none',
            background: 'var(--acc)', color: '#fff', cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ? Small field wrapper

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
