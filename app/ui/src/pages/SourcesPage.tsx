import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useBeacon } from '../context/BeaconContext'
import { TallyBlock, stateSub } from '../components/TallyBlock'
import { FullscreenOverlay } from '../components/FullscreenOverlay'
import { IconChevronLeft, IconChevronRight, IconFullscreen } from '../components/icons'
import type { SourceInfo } from '../../../src/tally/types/ProducerStates'
import { useTallyState } from '../hooks/useTallyState'
import { stateFromValue, type DeviceDisplayState } from '../types/beacon'

interface SelectedSource extends SourceInfo {
  prodName: string
}

// ? Source detail view

function SourceDetail({
  source,
  basePath,
  sourceState,
}: {
  source: SelectedSource
  basePath: string
  sourceState: (key: string) => DeviceDisplayState
}) {
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
          ['State',      stateSub(state)],
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

// ? Producer filter chips

interface FilterChipsProps {
  producers: { id: string; name: string }[]
  active: string | null
  onChange: (id: string | null) => void
}

function FilterChips({ producers, active, onChange }: FilterChipsProps) {
  const chip = (id: string | null, label: string) => (
    <button
      key={id ?? '__all'}
      onClick={() => onChange(id)}
      style={{
        fontSize: 11, padding: '3px 10px', borderRadius: 99, cursor: 'pointer',
        border: active === id
          ? 'none'
          : '0.5px solid var(--color-border-tertiary)',
        background: active === id ? 'var(--acc)' : 'var(--color-background-primary)',
        color: active === id ? '#fff' : 'var(--color-text-secondary)',
        transition: 'background .1s, color .1s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
      {chip(null, 'All')}
      {producers.map(p => chip(p.id, p.name))}
    </div>
  )
}

// ? Page

export default function SourcesPage() {
  const navigate = useNavigate()
  const { producer: producerId, source: sourceId } = useParams()
  const { producers, orchestratorConfig } = useBeacon()
  const [filterProducer, setFilterProducer] = useState<string | null>(null)
  const { states, connected, systemConnected } = useTallyState()

  const disconnectState = stateFromValue(orchestratorConfig.state_on_disconnect ?? 0)
  const sourceState = (key: string): DeviceDisplayState =>
    systemConnected ? (states.get(key) ?? 'none') : disconnectState

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
    return <SourceDetail source={selectedSource} basePath={basePath} sourceState={sourceState} />
  }

  const visibleProducers = filterProducer
    ? producers.filter(p => p.config.id === filterProducer)
    : producers

  const filterOptions = producers.map(p => ({ id: p.config.id, name: p.config.name ?? p.config.id }))

  const sourceCount = producers.reduce((sum, prod) => sum + Object.keys(prod.info.sources as unknown as Record<string, SourceInfo>).length, 0)

  return (
    <div>
      {/* <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
        Source states from all producers — click to view, then go fullscreen
      </div> */}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 6, flexShrink: 0,
            background: connected ? 'var(--pvw)' : 'var(--color-border-secondary)',
          }} />
          {sourceCount} source{sourceCount !== 1 ? 's' : ''} across {producers.length} producer{producers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {producers.length > 1 && (
        <FilterChips
          producers={filterOptions}
          active={filterProducer}
          onChange={setFilterProducer}
        />
      )}

      {producers.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          No producers connected — add a connection first
        </div>
      )}

      {visibleProducers.map(prod => {
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
