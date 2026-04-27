import { useState } from 'react'
import toast from 'react-hot-toast'
import { useBeacon } from '../context/BeaconContext'

const IPV4_RE = /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/
import { AddConnectionModal } from '../components/AddConnectionModal'
import type { ProducerBundle, SourceInfo } from '../../../src/tally/types/ProducerStates'
import type { ProducerConfig } from '../../../src/tally/producer/AbstractTallyProducer'
import { PRODUCER_TYPE_MAP } from '../config/producers'
import { Toggle } from '../components/Toggle'
import StatusPill from '../components/statusPill/StatusPill'

export default function ConnectionsPage() {
  const { producers, removeProducer } = useBeacon()
  const [editing, setEditing] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, height: '25px' }}>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          ATEM switcher connections
        </span>
        <button
          className="sm-btn"
          style={{ color: 'var(--acc)', borderColor: 'color-mix(in srgb, var(--acc) 35%, transparent)' }}
          onClick={() => setAddOpen(true)}
        >
          + Add connection
        </button>
      </div>

      <AddConnectionModal open={addOpen} onClose={() => setAddOpen(false)} />

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

// ? Producer card

interface ProducerCardProps {
  producer: ProducerBundle
  editing: boolean
  onEdit: () => void
  onRemove: () => void
}

function ProducerCard({ producer: prod, editing, onEdit, onRemove }: ProducerCardProps) {
  const { updateProducer, setProducerEnabled } = useBeacon()

  // Cast config to access type-specific fields (host/port set by ATEM producer)
  const cfg = prod.config as unknown as Record<string, unknown>

  const [name,    setName]    = useState(String(cfg.name    ?? ''))
  const [host,    setHost]    = useState(String(cfg.host    ?? ''))
  const [port,    setPort]    = useState(String(cfg.port    ?? ''))
  const [saving,  setSaving]  = useState(false)

  const sources    = Object.values(prod.info.sources as unknown as Record<string, SourceInfo>)
  const model      = prod.info.model.short ?? prod.info.model.long
  const typeLabel  = PRODUCER_TYPE_MAP[prod.type]?.shortLabel ?? prod.type

  const handleSave = async () => {
    if (cfg.host !== undefined && host && !IPV4_RE.test(host)) {
      toast.error(`Invalid IPv4 address: ${host}`)
      return
    }
    const portNum = parseInt(port)
    if (cfg.port !== undefined && port && (isNaN(portNum) || portNum < 1 || portNum > 65535)) {
      toast.error(`Invalid port: ${port}. Must be 1–65535.`)
      return
    }
    setSaving(true)
    try {
      const config: ProducerConfig & Record<string, unknown> = {
        id:   prod.config.id,
        name: name || undefined,
        ...(host ? { host } : {}),
        ...(port ? { port: portNum } : {}),
      }
      await updateProducer(prod.config.id, config)
      onEdit()
    } finally {
      setSaving(false)
    }
  }

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
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: prod.enabled ? (prod.info.status === 'Online' ? '#1D9E75' : '#E58C2A') : 'var(--color-border-secondary)' }} />
        <div style={{ 
          fontSize: 13, 
          fontWeight: 500, 
          color: 'var(--color-text-primary)', 
          flex: 1,
          opacity: prod.enabled ? 1 : 0.6,
        }}>
          {prod.config.name ?? prod.config.id}
        </div>
        <StatusPill 
          ok={prod.info.status === 'Online'} 
          text={prod.info.status} 
          disabled={!prod.enabled}
        />
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {[typeLabel, model].filter(Boolean).join(' · ')}
        </span>
        <Toggle checked={prod.enabled} onChange={v => setProducerEnabled(prod.config.id, v)} />
        <button className="sm-btn" onClick={onEdit}>
          {editing ? 'Close' : 'Edit'}
        </button>
      </div>

      {/* Edit body */}
      {editing && (
        <div style={{ padding: '12px 14px' }}>

          {/* Fields grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <Field label="Name">
              <input className="pf-input" value={name} onChange={e => setName(e.target.value)} placeholder={prod.config.id} />
            </Field>
            <Field label="Type">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingTop: 6 }}>{prod.type}</div>
            </Field>
            {cfg.host !== undefined && (
              <Field label="Host / IP">
                <input className="pf-input" value={host} onChange={e => setHost(e.target.value)} placeholder="192.168.1.100" pattern={IPV4_RE.source} />
              </Field>
            )}
            {cfg.port !== undefined && (
              <Field label="Port">
                <input className="pf-input" type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="9910" />
              </Field>
            )}
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                {sources.length} sources
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                fontSize: 12, padding: '6px 14px',
                borderRadius: 'var(--border-radius-md)', border: 'none',
                background: 'var(--acc)', color: '#fff', cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </div>
      {children}
    </div>
  )
}
