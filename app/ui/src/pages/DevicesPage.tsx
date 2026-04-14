import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBeacon } from '../context/BeaconContext'
import { DeviceDetailOverlay } from '../components/deviceDetail/DeviceDetailOverlay'
import { DeviceEditModal } from '../components/devices/DeviceEditPanel'
import { PatchModal } from '../components/PatchModal'
import { CONSUMER_SECTIONS } from '../config/consumers'
import { UITallyDevice } from '../types/DeviceStates'
import { GlobalDeviceTools } from '../../../src/tally/types/ConsumerStates'
import type { GlobalTallySource, SourceInfo } from '../../../src/tally/types/ProducerStates'
import { useTallyState } from '../hooks/useTallyState'
import { stateFromValue } from '../types/beacon'


export default function DevicesPage() {
  const navigate = useNavigate()
  const { consumer, device: deviceId } = useParams()
  const { devices, producers, consumers, orchestratorConfig, renameDevice, patchDevice, removeDevice } = useBeacon()
  const { states, deviceStates, systemConnected } = useTallyState()
  const disconnectState = stateFromValue(orchestratorConfig.state_on_disconnect ?? 0)

  function shortName(producer: string, source: string): string {
    const key = `${producer}:${source}`
    for (const p of producers) {
      const sources = p.info?.sources as unknown as Record<string, SourceInfo>
      if (sources?.[key]) return sources[key].short ?? source
    }
    return source
  }

  const [editing,      setEditing]      = useState<UITallyDevice | null>(null)
  const [patching,     setPatching]     = useState<UITallyDevice | null>(null)
  const [patchingFrom, setPatchingFrom] = useState<UITallyDevice | null>(null)

  const selectedDevice = consumer && deviceId
    ? devices.find(d => d.id.consumer === consumer && d.id.device === deviceId) ?? null
    : null

  const handleSaveName = async (dev: UITallyDevice, name: { short?: string; long: string }) => {
    setEditing(null)
    await renameDevice(dev.id, name)
  }

  const handleOpenPatch = (dev: UITallyDevice) => {
    setPatchingFrom(editing)   // remember which device opened the patch modal
    setEditing(null)
    setPatching(dev)
  }

  const handlePatchApply = async (patch: GlobalTallySource[]) => {
    if (!patching) return
    setPatchingFrom(null)
    setPatching(null)
    await patchDevice(patching.id, patch)
  }

  const handlePatchClose = () => {
    setPatching(null)
    if (patchingFrom) {
      setEditing(patchingFrom)  // return to edit modal
      setPatchingFrom(null)
    }
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
                  const isLast = idx === sectionDevices.length - 1
                  const liveDotState = systemConnected
                    ? (deviceStates.get(GlobalDeviceTools.create(dev.id.consumer, dev.id.device)) ?? stateFromValue(dev.state))
                    : disconnectState

                  return (
                    <div
                      key={GlobalDeviceTools.create(dev.id.consumer, dev.id.device)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10,
                        borderBottom: !isLast ? '0.5px solid var(--color-border-tertiary)' : 'none',
                      }}
                    >
                      <div
                        style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }}
                        className={`dot-${liveDotState}`}
                      />
                      <div style={{ width: 88, flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dev.name.long}
                        </div>
                        {dev.name.short && (
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                            {dev.name.short}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
                        {dev.patch.length === 0 ? (
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>No sources</span>
                        ) : (
                          dev.patch.map((src, i) => {
                            const key = `${src.producer}:${src.source}`
                            const srcState = states.get(key)
                            const active = srcState === 'pgm' || srcState === 'pvw'
                            return (
                              <span key={i} style={{
                                fontSize: 10, padding: '2px 7px', borderRadius: 99,
                                border: '0.5px solid',
                                background: srcState === 'pgm' ? 'var(--pgm)' : srcState === 'pvw' ? 'var(--pvw)' : 'var(--color-background-secondary)',
                                color:      active ? '#fff' : 'var(--color-text-secondary)',
                                borderColor: srcState === 'pgm' ? 'var(--pgm)' : srcState === 'pvw' ? 'var(--pvw)' : 'var(--color-border-tertiary)',
                              }}>
                                {shortName(src.producer, src.source)}
                              </span>
                            )
                          })
                        )}
                      </div>
                      <button className="sm-btn" onClick={() => setEditing(dev)}>Edit</button>
                      <button
                        className="sm-btn"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onClick={() => navigate(`/devices/${dev.id.consumer}/${dev.id.device}`)}
                      >
                        Detail
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}

      {editing && (
        <DeviceEditModal
          device={editing}
          open={!!editing}
          onSave={name => handleSaveName(editing, name)}
          onPatch={() => handleOpenPatch(editing)}
          onRemove={() => handleRemove(editing)}
          onClose={() => setEditing(null)}
        />
      )}

      {selectedDevice && (
        <DeviceDetailOverlay
          device={selectedDevice}
          backPath="/devices"
          backLabel="Devices"
        />
      )}

      <PatchModal
        open={!!patching}
        deviceName={patching?.name.long ?? patching?.id.device ?? ''}
        consumerName={patching?.consumer.name ?? ''}
        currentPatch={patching?.patch ?? []}
        producers={producers}
        onApply={handlePatchApply}
        onClose={handlePatchClose}
      />
    </div>
  )
}
