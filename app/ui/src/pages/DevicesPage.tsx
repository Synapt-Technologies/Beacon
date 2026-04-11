import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { DeviceDetailOverlay } from '../components/deviceDetail/DeviceDetailOverlay'
import { PatchModal } from '../components/PatchModal'
import type { UIDevice, GlobalTallySource } from '../types/beacon'

const CONSUMER_SECTIONS: Array<{ id: 'gpio' | 'aedes'; label: string }> = [
  { id: 'gpio',  label: 'GPIO hardware' },
  { id: 'aedes', label: 'MQTT broker' },
]

export default function DevicesPage() {
  const { devices, producers, patchDevice, renameDevice } = useApp()
  const [detail, setDetail]   = useState<UIDevice | null>(null)
  const [editing, setEditing] = useState<string | null>(null)  // device key
  const [patching, setPatching] = useState<UIDevice | null>(null)

  // Local name edit state
  const [nameEdit, setNameEdit] = useState<{ long: string; short: string }>({ long: '', short: '' })

  const startEdit = (dev: UIDevice) => {
    setEditing(dev.key)
    setNameEdit({ long: dev.long, short: dev.short })
  }

  const saveName = async (dev: UIDevice) => {
    await renameDevice(dev.key, nameEdit)
    setEditing(null)
  }

  const handlePatchApply = async (patch: GlobalTallySource[]) => {
    if (!patching) return
    setPatching(null)
    await patchDevice(patching.key, patch)
  }

  return (
    <div>
      {CONSUMER_SECTIONS.map(({ id, label }) => {
        const sectionDevices = devices.filter(d => d.consumerId === id)
        return (
          <div key={id}>
            <div className="sec-lbl">{label}</div>
            <div className="s-card" style={{ marginBottom: 14 }}>
              {sectionDevices.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  No devices — consumer may be disabled
                </div>
              ) : (
                sectionDevices.map((dev, idx) => (
                  <div key={dev.key}>
                    {/* Main row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10,
                      borderBottom: editing === dev.key || idx < sectionDevices.length - 1
                        ? '0.5px solid var(--color-border-tertiary)' : 'none',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }}
                           className={`dot-${dev.state}`} />
                      <div style={{ width: 88, flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dev.long}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                          {dev.short}
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
                        {dev.patch.length === 0 ? (
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>No sources</span>
                        ) : (
                          dev.patch.map((src, i) => (
                            <span key={i} style={{
                              fontSize: 10, padding: '2px 7px', borderRadius: 99,
                              background: 'var(--color-background-secondary)',
                              color: 'var(--color-text-secondary)',
                              border: '0.5px solid var(--color-border-tertiary)',
                            }}>
                              {src.source}
                            </span>
                          ))
                        )}
                      </div>
                      <button className="sm-btn" onClick={() => setPatching(dev)}>Patch</button>
                      <button className="sm-btn" onClick={() => startEdit(dev)}>Edit</button>
                      <button
                        className="sm-btn"
                        onClick={() => setDetail(dev)}
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        Detail
                      </button>
                    </div>

                    {/* Name edit panel */}
                    {editing === dev.key && (
                      <div style={{
                        padding: '12px 14px',
                        background: 'var(--color-background-secondary)',
                        borderBottom: idx < sectionDevices.length - 1
                          ? '0.5px solid var(--color-border-tertiary)' : 'none',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                              Short name
                            </div>
                            <input
                              className="pf-input"
                              value={nameEdit.short}
                              onChange={e => setNameEdit(n => ({ ...n, short: e.target.value }))}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                              Long name
                            </div>
                            <input
                              className="pf-input"
                              value={nameEdit.long}
                              onChange={e => setNameEdit(n => ({ ...n, long: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button className="sm-btn" onClick={() => setEditing(null)}>Cancel</button>
                          <button
                            onClick={() => saveName(dev)}
                            style={{
                              fontSize: 12, padding: '5px 14px', borderRadius: 99,
                              border: 'none', background: 'var(--acc)', color: '#fff', cursor: 'pointer',
                            }}
                          >
                            Save name
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}

      {detail && (
        <DeviceDetailOverlay
          device={detail}
          backLabel="Devices"
          onClose={() => setDetail(null)}
        />
      )}

      <PatchModal
        open={!!patching}
        deviceName={patching?.long ?? ''}
        consumerName={patching?.consumerName ?? ''}
        currentPatch={patching?.patch ?? []}
        producers={producers}
        onApply={handlePatchApply}
        onClose={() => setPatching(null)}
      />
    </div>
  )
}