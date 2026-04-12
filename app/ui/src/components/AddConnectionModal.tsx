import { useState, useEffect } from 'react'
import { useBeacon } from '../context/BeaconContext'
import type { ProducerConfig } from '../../../src/tally/producer/AbstractTallyProducer'

// ? Producer type registry — extend here when new producer types are added

interface ProducerTypedef {
  id:          string        // matches TallyFactory switch case
  label:       string
  defaultName: string
  fields:      FieldDef[]
}

interface FieldDef {
  key:         string
  label:       string
  type:        'text' | 'number'
  placeholder: string
  default:     string | number
}

const PRODUCER_TYPES: ProducerTypedef[] = [
  {
    id:          'AtemNetClientTallyProducer',
    label:       'ATEM Switcher',
    defaultName: 'ATEM',
    fields: [
      { key: 'host', label: 'Host / IP',   type: 'text',   placeholder: '192.168.1.100', default: '' },
      { key: 'port', label: 'Port',         type: 'number', placeholder: '9910',          default: 9910 },
    ],
  },
]

function slugify(host: string): string {
  return 'atem-' + host.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

// ? Component

interface AddConnectionModalProps {
  open:    boolean
  onClose: () => void
}

export function AddConnectionModal({ open, onClose }: AddConnectionModalProps) {
  const { addProducer } = useBeacon()

  const [typeId,   setTypeId]   = useState(PRODUCER_TYPES[0].id)
  const [name,     setName]     = useState('')
  const [id,       setId]       = useState('')
  const [idTouched, setIdTouched] = useState(false)
  const [fields,   setFields]   = useState<Record<string, string | number>>({})
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const typedef = PRODUCER_TYPES.find(t => t.id === typeId) ?? PRODUCER_TYPES[0]

  // Reset form when modal opens or type changes
  useEffect(() => {
    if (!open) return
    const defaults: Record<string, string | number> = {}
    for (const f of typedef.fields) defaults[f.key] = f.default
    setName(typedef.defaultName)
    setId('')
    setIdTouched(false)
    setFields(defaults)
    setError(null)
    setLoading(false)
  }, [open, typeId])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const host = String(fields['host'] ?? '')
  const autoId = host ? slugify(host) : ''

  const displayId = idTouched ? id : autoId

  const setField = (key: string, value: string | number) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    const resolvedId = displayId.trim()
    if (!resolvedId) { setError('ID is required'); return }
    if (!name.trim()) { setError('Name is required'); return }

    const config: Record<string, unknown> = { id: resolvedId, name: name.trim() }
    for (const f of typedef.fields) {
      const val = fields[f.key]
      config[f.key] = f.type === 'number' ? Number(val) : val
    }

    setLoading(true)
    setError(null)
    try {
      await addProducer(typeId, config as ProducerConfig & Record<string, unknown>)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 25,
      background: 'rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 28,
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        borderRadius: 'var(--border-radius-lg)',
        width: 380,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '0.5px solid var(--color-border-tertiary)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Add connection
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Connect a new tally producer to Beacon
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Type</label>
            <select
              className="pf-input"
              value={typeId}
              onChange={e => setTypeId(e.target.value)}
            >
              {PRODUCER_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Name</label>
            <input
              className="pf-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={typedef.defaultName}
            />
          </div>

          {/* Dynamic type fields */}
          {typedef.fields.map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>{f.label}</label>
              <input
                className="pf-input"
                type={f.type}
                value={String(fields[f.key] ?? f.default)}
                placeholder={f.placeholder}
                onChange={e => setField(f.key, f.type === 'number' ? e.target.value : e.target.value)}
              />
            </div>
          ))}

          {/* ID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>
              ID
              {!idTouched && autoId && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                  auto-generated
                </span>
              )}
            </label>
            <input
              className="pf-input"
              value={displayId}
              placeholder="atem-1"
              onChange={e => { setId(e.target.value); setIdTouched(true) }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: 'var(--pgm)', padding: '6px 10px', background: 'color-mix(in srgb, var(--pgm) 10%, transparent)', borderRadius: 'var(--border-radius-md)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '11px 16px', borderTop: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              fontSize: 12, padding: '6px 14px',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-tertiary)',
              background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              fontSize: 12, padding: '6px 14px',
              borderRadius: 'var(--border-radius-md)',
              border: 'none', background: 'var(--acc)', color: '#fff',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Adding…' : 'Add connection'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 500,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '.06em',
}
