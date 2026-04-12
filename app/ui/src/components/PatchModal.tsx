import { useState, useEffect } from 'react'
import type { ProducerBundle, GlobalTallySource, SourceInfo } from '../../../src/tally/types/ProducerStates'

interface PatchModalProps {
  open:         boolean
  deviceName:   string
  consumerName: string
  currentPatch: GlobalTallySource[]
  producers:    ProducerBundle[]
  onApply:      (patch: GlobalTallySource[]) => void
  onClose:      () => void
}

export function PatchModal({
  open, deviceName, consumerName, currentPatch, producers, onApply, onClose,
}: PatchModalProps) {
  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(new Set(currentPatch.map(s => `${s.producer}:${s.source}`)))
    }
  }, [open, currentPatch])

  if (!open) return null

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleApply = () => {
    const patch: GlobalTallySource[] = [...selected].map(k => {
      const idx = k.indexOf(':')
      return { producer: k.slice(0, idx), source: k.slice(idx + 1) }
    })
    onApply(patch)
  }

  const q = query.toLowerCase()

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
        width: 380, maxHeight: 520,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '0.5px solid var(--color-border-tertiary)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Edit patch — {deviceName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {consumerName} · select sources from any producer
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <input
            className="pf-input"
            type="text"
            placeholder="Search sources…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Source list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {producers.map(prod => {
            // sources is a Map<string, SourceInfo> on the server but arrives as a plain
            // object after JSON serialisation — cast once here, not at every call site
            const allSources = Object.values(prod.info.sources as unknown as Record<string, SourceInfo>)
            const sources = allSources.filter(s =>
              !q ||
              s.short.toLowerCase().includes(q) ||
              s.long.toLowerCase().includes(q)
            )
            if (!sources.length) return null
            return (
              <div key={prod.config.id}>
                <div style={{
                  fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '.07em',
                  padding: '8px 16px 3px',
                }}>
                  {prod.config.name ?? prod.config.id}
                </div>
                {sources.map(src => {
                  const key     = `${src.source.producer}:${src.source.source}`
                  const checked = selected.has(key)
                  return (
                    <div
                      key={key}
                      onClick={() => toggle(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 16px', cursor: 'pointer',
                        background: checked ? 'color-mix(in srgb, var(--acc) 5%, transparent)' : 'transparent',
                        transition: 'background .1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(key)}
                        onClick={e => e.stopPropagation()}
                        style={{ accentColor: 'var(--acc)', cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }}
                      />
                      <span style={{ width: 38, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                        {src.short}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                        {src.long}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {producers.every(p => {
            const sources = p.info.sources as unknown as Record<string, SourceInfo>
            return Object.keys(sources).length === 0
          }) && (
            <div style={{ padding: '16px', fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              No sources available — check producer connections
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '11px 16px', borderTop: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {selected.size} source{selected.size !== 1 ? 's' : ''} selected
          </span>
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
            onClick={handleApply}
            style={{
              fontSize: 12, padding: '6px 14px',
              borderRadius: 'var(--border-radius-md)',
              border: 'none', background: 'var(--acc)', color: '#fff', cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
