import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useBeacon } from '../context/BeaconContext'
import { TallyBlock, stateSub } from '../components/TallyBlock'
import { FullscreenOverlay } from '../components/FullscreenOverlay'
import { IconChevronLeft, IconChevronRight, IconFullscreen } from '../components/icons'
import type { SourceInfo } from '../../../src/tally/types/ProducerStates'

interface SelectedSource extends SourceInfo {
  prodName: string
}

// TODO: replace with live tally state from WebSocket / SSE once available
const sourceState = (_key: string): 'pgm' | 'pvw' | 'none' => 'none'

// ? Source detail view

function SourceDetail({ source, basePath }: { source: SelectedSource; basePath: string }) {
  const navigate = useNavigate()
  const location = useLocation()

  const fsOpen = location.pathname.endsWith('/fullscreen')
  const state  = sourceState(`${source.source.producer}:${source.source.source}`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => navigate('/web-tally')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
            color: 'var(--color-text-secondary)', border: 'none', background: 'none',
            cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--border-radius-md)',
          }}
        >
          <IconChevronLeft /> All sources
        </button>
        <button
          onClick={() => navigate(`${basePath}/fullscreen`)}
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

      <TallyBlock name={source.long} sub={stateSub(state)} state={state} height={160} nameFontSize={26} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {([
          ['Producer',   source.prodName],
          ['Short name', source.short],
          ['Source ID',  `${source.source.producer}:${source.source.source}`],
          ['State',      state === 'pgm' ? 'Program' : state === 'pvw' ? 'Preview' : 'Idle'],
        ] as [string, string][]).map(([label, value]) => (
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
        name={source.short}
        sub={`${source.long} · ${source.prodName}`}
        onClose={() => navigate(basePath)}
      />
    </div>
  )
}

// ? Page

export default function WebTallyPage() {
  const navigate = useNavigate()
  const { producer: producerId, source: sourceId } = useParams()
  const { producers } = useBeacon()

  // Reconstruct SelectedSource from URL params + loaded producers
  let selectedSource: SelectedSource | null = null
  if (producerId && sourceId) {
    for (const prod of producers) {
      const sources = prod.info.sources as unknown as Record<string, SourceInfo>
      const globalKey = `${producerId}:${sourceId}`
      if (sources?.[globalKey]) {
        selectedSource = { ...sources[globalKey], prodName: prod.config.name ?? prod.config.id }
        break
      }
    }
  }

  const basePath = producerId && sourceId ? `/web-tally/${producerId}/${sourceId}` : '/web-tally'

  if (selectedSource) {
    return <SourceDetail source={selectedSource} basePath={basePath} />
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
        Source states from all producers — click to view, then go fullscreen
      </div>

      {producers.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          No producers connected — add a connection first
        </div>
      )}

      {producers.map(prod => {
        const sources = Object.values(prod.info.sources as unknown as Record<string, SourceInfo>)
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
                  onClick={() => navigate(`/web-tally/${src.source.producer}/${src.source.source}`)}
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
    </div>
  )
}
