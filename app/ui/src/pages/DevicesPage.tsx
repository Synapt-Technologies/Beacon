import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBeacon } from '../context/BeaconContext'
import { DeviceDetailOverlay } from '../components/deviceDetail/DeviceDetailOverlay'
import { DeviceEditPanel } from '../components/devices/DeviceEditPanel'
import { PatchModal } from '../components/PatchModal'
import { CONSUMER_SECTIONS } from '../config/consumers'
import { UITallyDevice } from '../types/DeviceStates'
import { DeviceTallyState, GlobalDeviceTools } from '../../../src/tally/types/ConsumerStates'
import type { GlobalTallySource } from '../../../src/tally/types/ProducerStates'

export default function DevicesPage() {
  const navigate = useNavigate()
  const { consumer, device: deviceId } = useParams()
  const { devices, producers, consumers, renameDevice, patchDevice, removeDevice } = useBeacon()

  const [editing,  setEditing]  = useState<string | null>(null)   // device key
  const [patching, setPatching] = useState<UITallyDevice | null>(null)

  const selectedDevice = consumer && deviceId
    ? devices.find(d => d.id.consumer === consumer && d.id.device === deviceId) ?? null
    : null

  const handleSaveName = async (dev: UITallyDevice, name: { short: string; long: string }) => {
    setEditing(null)
    await renameDevice(dev.id, name)
  }

  const handlePatchApply = async (patch: GlobalTallySource[]) => {
    if (!patching) return
    setPatching(null)
    await patchDevice(patching.id, patch)
  }

  const handleRemove = async (dev: UITallyDevice) => {
    setEditing(null)
    await removeDevice(dev.id)
  }

  return (
    <div>
      {CONSUMER_SECTIONS.map(({ id, label }) => {
        const consumerEntry = consumers[id as keyof typeof consumers]
        if (consumerEntry?.enabled === false) return null

        const sectionDevices = devices.filter(d => d.id.consumer === id)
        return (
          <div key={id}>
            <div className="sec-lbl">{label}</div>
            <div className="s-card" style={{ marginBottom: 14 }}>
              {sectionDevices.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  No devices found
                </div>
              ) : (
                sectionDevices.map((dev, idx) => {
                  const devKey   = GlobalDeviceTools.create(dev.id.consumer, dev.id.device)
                  const isEditing = editing === devKey
                  const isLast    = idx === sectionDevices.length - 1

                  return (
                    <div key={devKey}>
                      {/* Main row */}
                      <div style={{
                        display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10,
                        borderBottom: !isLast || isEditing ? '0.5px solid var(--color-border-tertiary)' : 'none',
                      }}>
                        <div
                          style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }}
                          className={`dot-${DeviceTallyState[dev.state].toLowerCase()}`}
                        />
                        <div style={{ width: 88, flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {dev.name?.long ?? dev.id.device}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                            {dev.name?.short ?? dev.id.device}
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
                        <button className="sm-btn" onClick={() => setEditing(isEditing ? null : devKey)}>
                          {isEditing ? 'Close' : 'Edit'}
                        </button>
                        <button
                          className="sm-btn"
                          style={{ color: 'var(--color-text-tertiary)' }}
                          onClick={() => navigate(`/devices/${dev.id.consumer}/${dev.id.device}`)}
                        >
                          Detail
                        </button>
                      </div>

                      {/* Edit panel */}
                      {isEditing && (
                        <DeviceEditPanel
                          device={dev}
                          onSave={name => handleSaveName(dev, name)}
                          onPatch={() => { setPatching(dev); setEditing(null) }}
                          onRemove={() => handleRemove(dev)}
                          onCancel={() => setEditing(null)}
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}

      {selectedDevice && (
        <DeviceDetailOverlay
          device={selectedDevice}
          backPath="/devices"
          backLabel="Devices"
        />
      )}

      {/* producers.info.sources is a plain object at runtime */}
      <PatchModal
        open={!!patching}
        deviceName={patching?.name?.long ?? patching?.id.device ?? ''}
        consumerName={patching?.consumer.name ?? ''}
        currentPatch={patching?.patch ?? []}
        producers={producers}
        onApply={handlePatchApply}
        onClose={() => setPatching(null)}
      />
    </div>
  )
}
