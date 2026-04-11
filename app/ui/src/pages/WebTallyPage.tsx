import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { TallyBlock, stateSub } from '../components/TallyBlock'
import { FullscreenOverlay } from '../components/FullscreenOverlay'
import { IconChevronLeft, IconChevronRight, IconFullscreen } from '../components/icons'
import type { SourceInfo } from '../types/beacon'

interface SelectedSource extends SourceInfo {
  prodName: string
}

export default function WebTallyPage() {
  const { producers } = useApp()
  const [selected, setSelected] = useState<SelectedSource | null>(null)
  const [fsOpen, setFsOpen]     = useState(false)

  // Compute tally state for each source from global tally state
  // In production this should come from a WebSocket / SSE feed
  // For now, no state is available without /api/devices
  const sourceState = (_key: string): 'pgm' | 'pvw' | 'none' => 'none'

  // TODO: Filter by producer

  if (selected) {
    const state = sourceState(`${selected.source.producer}:${selected.source.source}`)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
              color: 'var(--color-text-secondary)', border: 'none', background: 'none',
              cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--border-radius-md)',
            }}
          >
            <IconChevronLeft /> All sources
          </button>
          <button
            onClick={() => setFsOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              marginLeft: 'auto', padding: '6px 14px', borderRadius: 99,
              border: '0.5px solid var(--color-border-tertiary)',
              background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            <IconFullscreen /> Fullscreen
          </button>
        </div>

        <TallyBlock
          name={selected.long}
          sub={stateSub(state)}
          state={state}
          height={160}
          nameFontSize={26}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Producer',   selected.prodName],
            ['Short name', selected.short],
            ['Source ID',  `${selected.source.producer}:${selected.source.source}`],
            ['State',      state === 'pgm' ? 'Program' : state === 'pvw' ? 'Preview' : 'Idle'],
          ].map(([label, value]) => (
            <div key={label} style={{
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)', padding: '9px 11px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <FullscreenOverlay
          open={fsOpen}
          state={state}
          name={selected.short}
          sub={selected.long + " → " + selected.prodName}
          onClose={() => setFsOpen(false)}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
        Source states from all producers — click to view, then go fullscreen
      </div>

      {producers.map(prod => {
        const sources = prod.info ? Object.values(prod.info.sources) : []
        return (
          <div key={prod.config.id} style={{ marginBottom: 16 }}>
            <div className="sec-lbl">{prod.config.name ?? prod.config.id}</div>

            {sources.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
                No sources — producer may not be connected
              </div>
            )}

            {sources.map(src => {
              const key   = `${src.source.producer}:${src.source.source}`
              const state = sourceState(key)
              return (
                <div
                  key={key}
                  className={`row-card tl-${state}`}
                  onClick={() => setSelected({ ...src, prodName: prod.config.name ?? prod.config.id })}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {src.long}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {src.short} · {prod.config.name ?? prod.config.id}
                    </div>
                  </div>
                  <IconChevronRight style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        )
      })}

      {producers.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          No producers connected — add a connection first
        </div>
      )}
    </div>
  )
}