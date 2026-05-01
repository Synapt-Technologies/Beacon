import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBeacon } from '../../context/BeaconContext'
import { useTallyState } from '../../hooks/useTallyState'
import { TallyBlock, stateSub } from '../TallyBlock'
import { PatchModal } from '../PatchModal'
import { FullscreenOverlay } from '../FullscreenOverlay'
import { IconChevronLeft, IconFullscreen } from '../icons'
import InfoBox from './InfoBox'
import PatchedSourceRow from './PatchedSourceRow'
import DeviceAlerts from './DeviceAlerts'
import { UITallyDevice } from '../../types/DeviceStates'
import { ConnectionType, GlobalDeviceTools } from '../../../../src/tally/types/ConsumerStates'
import type { GlobalTallySource } from '../../../../src/tally/types/ProducerStates'
import { stateFromValue, type DeviceDisplayState } from '../../types/beacon'
import { DeviceEditModal } from '../devices/DeviceEditPanel'

interface DeviceDetailOverlayProps {
    device: UITallyDevice
    backPath: string    // e.g. '/overview' or '/devices'
    backLabel: string
}

const CONNECTION_LABELS: Record<ConnectionType, string> = {
    [ConnectionType.HARDWARE]: 'Hardware',
    [ConnectionType.NETWORK]:  'Network',
    [ConnectionType.WIRELESS]: 'Wireless',
    [ConnectionType.VIRTUAL]:  'Virtual',
}

function formatTs(ms?: number): string { // TODO: move to shared util
    if (!ms) return '—'
    const s = Math.round((Date.now() - ms) / 1000)
    if (s < 5)       return 'Just now'
    if (s < 60)      return `${s}s ago`
    if (s > 60 * 60) return `More than ${Math.floor(s / 60 / 60)}h ago`
    return `${Math.round(s / 60)}m ago`
}


export function DeviceDetailOverlay({ device, backPath, backLabel }: DeviceDetailOverlayProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const { producers, uiConfig, orchestratorConfig, patchDevice, renameDevice, removeDevice } = useBeacon()
    const { states, deviceStates, systemConnected } = useTallyState()
    const disconnectState = stateFromValue(orchestratorConfig.state_on_disconnect ?? 0)
    const [patchOpen, setPatchOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    const basePath    = `${backPath}/${device.id.consumer}/${device.id.device}`
    const fsOpen      = location.pathname.endsWith('/fullscreen')
    const liveState: DeviceDisplayState = systemConnected
        ? (deviceStates.get(GlobalDeviceTools.create(device.id.consumer, device.id.device)) ?? 'none')
        : disconnectState
    const stateStr = liveState
    const deviceKey   = GlobalDeviceTools.create(device.id.consumer, device.id.device)
    const deviceLong  = device.name.long
    const deviceShort = device.name.short ?? device.name.long ?? device.id.device

    const handlePatchApply = async (patch: GlobalTallySource[]) => {
        setPatchOpen(false)
        await patchDevice(device.id, patch)
    }
    
    const handleSaveName = async (name: { short?: string; long: string }) => {
        setEditOpen(false)
        await renameDevice(device.id, name)
    }

    const handleRemove = async () => {
        setEditOpen(false)
        await removeDevice(device.id)
    }

    return (
        <>
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', background: 'var(--color-background-secondary)' }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', height: '56px',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    background: 'var(--color-background-primary)', flexShrink: 0,
                }}>
                    <button
                        onClick={() => navigate(backPath)}
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
                        {deviceLong}
                    </span>
                    <button
                        onClick={() => navigate(`${basePath}/fullscreen`)}
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
                    <TallyBlock name={deviceLong} sub={stateSub(stateStr)} state={stateStr} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        <InfoBox label="Short Name"  value={device.name.short ?? ""} />
                        <InfoBox label="Connection"  value={CONNECTION_LABELS[device.connection] ?? 'Unknown'} />
                        <InfoBox label="Device ID"   value={deviceKey} />
                        <InfoBox label="Consumer"    value={device.consumer.name} />
                        {/* <InfoBox label="Last update" value={formatTs(device.last_update)} /> */}
                    </div>

                    <div className="sec-lbl">Patched sources</div>
                    {device.patch.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
                            No sources patched
                        </div>
                    ) : (
                        device.patch.map((src, i) => (
                            <PatchedSourceRow
                                key={i}
                                src={src}
                                producers={producers}
                                tallyState={systemConnected ? (states.get(`${src.producer}:${src.source}`) ?? 'none') : 'none'}
                            />
                        ))
                    )}

                    <DeviceAlerts device={device.id} slots={uiConfig.alerts} />

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button className="sm-btn" onClick={() => setEditOpen(true)}>
                            Edit Device
                        </button>
                        <button className="sm-btn" onClick={() => setPatchOpen(true)}>
                            Edit patch
                        </button>
                    </div>
                </div>

                <FullscreenOverlay
                    open={fsOpen}
                    state={stateStr}
                    name={deviceShort}
                    sub={deviceLong}
                    onClose={() => navigate(basePath)}
                />

                {/* producers.info.sources is a plain object at runtime */}
                <PatchModal
                    open={patchOpen}
                    deviceName={deviceLong}
                    consumerName={device.consumer.name}
                    currentPatch={device.patch}
                    producers={producers}
                    onApply={handlePatchApply}
                    onClose={() => setPatchOpen(false)}
                />

                
                <DeviceEditModal
                    device={device}
                    open={editOpen}
                    onSave={name => handleSaveName(name)}
                    onRemove={() => handleRemove()}
                    onClose={() => setEditOpen(false)}
                />
            </div>
        </>
    )
}
