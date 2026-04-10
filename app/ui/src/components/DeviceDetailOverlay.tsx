import { useState } from 'react'
import type { UIDevice, GlobalTallySource } from '../types/beacon'
import { useApp } from '../context/AppContext'
import { TallyBlock, stateSub } from './TallyBlock'
import { AlertButtons } from './AlertButtons'
import { PatchModal } from './PatchModal'
import { FullscreenOverlay } from './FullscreenOverlay'
import { IconChevronLeft, IconFullscreen } from './icons'

interface DeviceDetailOverlayProps {
  device: UIDevice | null
  backLabel: string
  onClose: () => void
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '9px 11px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  )
}

export function DeviceDetailOverlay({ device, backLabel, onClose }: DeviceDetailOverlayProps) {
  const { producers, settings, patchDevice, renameDevice, sendAlert } = useApp()
  const [patchOpen, setPatchOpen]   = useState(false)
  const [fsOpen, setFsOpen]         = useState(false)

  if (!device) return null

  const stateLabel =
    device.state === 'pgm' ? 'Program' :
    device.state === 'pvw' ? 'Preview' : 'Idle'

  const handleAlert = async (action: string, target: string | null) => {
    try {
      const [consumer, ...rest] = device.key.split(':')
      await sendAlert(device.key, action, target ?? 'ALL')
    } catch { /* fire-and-forget in UI */ }
  }

  const handlePatchApply = async (patch: GlobalTallySource[]) => {
    setPatchOpen(false)
    await patchDevice(device.key, patch)
  }

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', background: 'var(--color-background-secondary)' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
              color: 'var(--color-text-secondary)', cursor: 'pointer',
              border: 'none', background: 'none', padding: '4px 8px',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            <IconChevronLeft /> {backLabel}
          </button>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {device.long}
          </span>
          <button
            onClick={() => setFsOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              padding: '6px 14px', borderRadius: 99,
              border: '0.5px solid var(--color-border-tertiary)',
              background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            <IconFullscreen /> Fullscreen
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          <TallyBlock name={device.long} sub={stateSub(device.state)} state={device.state} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <InfoBox label="Consumer"    value={device.consumerName} />
            <InfoBox label="Connection"  value={device.connectionLabel} />
            <InfoBox label="Device ID"   value={device.key} />
            <InfoBox label="Last update" value={device.lastUpdate} />
          </div>

          <div className="sec-lbl">Patched sources</div>
          {device.patch.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
              No sources patched
            </div>
          ) : (
            device.patch.map((src, i) => {
              // Try to find source info from producers
              const globalKey = `${src.producer}:${src.source}`
              let srcInfo = null
              for (const p of producers) {
                if (p.info?.sources[globalKey]) { srcInfo = p.info.sources[globalKey]; break }
              }
              const prodEntry = producers.find(p => p.config.id === src.producer)
              return (
                <div key={i} style={{
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 7px',
                    borderRadius: 4, border: '0.5px solid currentColor',
                    flexShrink: 0, minWidth: 30, textAlign: 'center',
                    color: 'var(--color-text-secondary)',
                  }}>
                    {srcInfo?.short ?? src.source}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {srcInfo?.long ?? `Source ${src.source}`}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                      {prodEntry?.config.name ?? src.producer}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 99,
                    background: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)',
                  }}>
                    {stateLabel}
                  </span>
                </div>
              )
            })
          )}

          {/* Alerts */}
          <div style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)', padding: '12px 14px', marginTop: 10,
          }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              Alerts
            </div>
            <AlertButtons slots={settings.alertConfig} onAlert={handleAlert} />
          </div>

          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="sm-btn" onClick={() => setPatchOpen(true)}>
              Edit patch
            </button>
          </div>
        </div>

        {/* Fullscreen overlay */}
        <FullscreenOverlay
          open={fsOpen}
          state={device.state}
          name={device.long}
          sub={device.patch.length
            ? device.patch.map(s => s.source).join(', ')
            : 'No sources patched'}
          onClose={() => setFsOpen(false)}
        />

        {/* Patch modal */}
        <PatchModal
          open={patchOpen}
          deviceName={device.long}
          consumerName={device.consumerName}
          currentPatch={device.patch}
          producers={producers}
          onApply={handlePatchApply}
          onClose={() => setPatchOpen(false)}
        />
      </div>
    </>
  )
}