import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { ProducerEntry } from '../types/beacon'

export default function ConnectionsPage() {
  const { producers, removeProducer } = useApp()
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          ATEM switcher connections
        </span>
        {/* Add producer — POST /api/producers not yet in AdminServer, placeholder */}
        <button
          className="sm-btn"
          style={{ color: 'var(--acc)', borderColor: 'color-mix(in srgb, var(--acc) 35%, transparent)' }}
          onClick={() => alert('Add producer: wire up to POST /api/producers')}
        >
          + Add connection
        </button>
      </div>

      {producers.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          No producers configured
        </div>
      )}

      {producers.map(prod => (
        <ProducerCard
          key={prod.config.id}
          producer={prod}
          editing={editing === prod.config.id}
          onEdit={() => setEditing(e => e === prod.config.id ? null : prod.config.id)}
          onRemove={async () => {
            if (confirm(`Remove ${prod.config.name ?? prod.config.id}?`)) {
              await removeProducer(prod.config.id)
            }
          }}
        />
      ))}
    </div>
  )
}

interface ProducerCardProps {
  producer: ProducerEntry
  editing: boolean
  onEdit: () => void
  onRemove: () => void
}

function ProducerCard({ producer: prod, editing, onEdit, onRemove }: ProducerCardProps) {
  const [name, setName]   = useState(prod.config.name ?? '')
  const [host, setHost]   = useState(prod.config.host ?? '')
  const [port, setPort]   = useState(String(prod.config.port ?? 9910))

  const connected = prod.info?.connected ?? false
  const sources   = prod.info ? Object.values(prod.info.sources) : []

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)', marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        borderBottom: editing ? '0.5px solid var(--color-border-tertiary)' : 'none',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: connected ? '#1D9E75' : 'var(--color-border-secondary)' }} />
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
          {prod.config.name ?? prod.config.id}
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {prod.info?.model ?? prod.type} · {sources.length} sources
        </span>
        <button className="sm-btn" onClick={onEdit}>
          {editing ? 'Close' : 'Edit'}
        </button>
      </div>

      {/* Edit body */}
      {editing && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Name',       value: name, set: setName },
              { label: 'IP address', value: host, set: setHost },
              { label: 'Port',       value: port, set: setPort },
            ].map(({ label, value, set }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {label}
                </div>
                <input className="pf-input" value={value} onChange={e => set(e.target.value)} />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Sources
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', paddingTop: 5 }}>
                {sources.length} auto-discovered on connect
              </div>
            </div>
          </div>

          {sources.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {sources.slice(0, 12).map(s => (
                <span key={`${s.source.producer}:${s.source.source}`} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 99,
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                }}>
                  {s.short}
                </span>
              ))}
              {sources.length > 12 && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 99,
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-tertiary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                }}>
                  +{sources.length - 12}
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { alert('PATCH /api/producers/:id — wire up in AdminServer'); onEdit() }}
              style={{
                fontSize: 12, padding: '6px 14px',
                borderRadius: 'var(--border-radius-md)', border: 'none',
                background: 'var(--acc)', color: '#fff', cursor: 'pointer',
              }}
            >
              Save changes
            </button>
            <button
              onClick={onRemove}
              style={{
                fontSize: 12, padding: '6px 14px',
                borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid color-mix(in srgb, var(--pgm) 35%, transparent)',
                background: 'none', color: 'var(--pgm)', cursor: 'pointer',
              }}
            >
              Remove
            </button>
            <button className="sm-btn" style={{ marginLeft: 'auto' }} onClick={onEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
