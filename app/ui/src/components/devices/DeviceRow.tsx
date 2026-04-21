import { IconChevronRight } from '../icons'
import { UITallyDevice } from '../../types/DeviceStates'
import { stateFromValue, type DeviceDisplayState } from '../../types/beacon'
import { useBeacon } from '../../context/BeaconContext'
import { useTallyState } from '../../hooks/useTallyState'
import { DeviceAddressDto } from '../../../../src/tally/types/DeviceTypes'
import type { ProducerId } from '../../../../src/tally/types/ProducerTypes'
import type { SourceId, SourceInfo } from '../../../../src/tally/types/SourceTypes'

type SourceState = 'pgm' | 'pvw' | 'none'

const SOURCE_CHIP_STYLE: Record<SourceState, object> = {
    pgm:  { background: 'none', color: 'var(--pgm)', borderColor: 'transparent' },
    pvw:  { background: 'none', color: 'var(--pvw)', borderColor: 'transparent' },
    none: { background: 'none', color: 'var(--color-text-tertiary)', borderColor: 'transparent' },
}

export default function DeviceRow({
    device,
    onSelect,
}: {
    device: UITallyDevice
    onSelect: () => void
}) {
    const { producers, orchestratorConfig } = useBeacon()
    const { states, deviceStates, systemConnected } = useTallyState()

    const disconnectState = stateFromValue(orchestratorConfig.state_on_disconnect ?? 0)
    const deviceKey       = DeviceAddressDto.from(device.id).toKey()
    const liveState: DeviceDisplayState = systemConnected
        ? (deviceStates.get(deviceKey) ?? 'none')
        : disconnectState

    function shortName(producer: ProducerId, source: SourceId): string {
        const key = `${producer}:${source}`; // TODO: GlobalSourceTools?
        
        for (const p of producers) {
            const sources = p.info?.sources as unknown as Record<string, SourceInfo>
            if (sources?.[key]) return sources[key].name?.short ?? source
        }
        return key
    }

    return (
        <div
            className={`row-card tl-${liveState}`}
            onClick={onSelect}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {device.name.long}
                </div>
                {device.patch.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        No sources patched
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                        {device.patch.map((src, i) => {
                            const key   = `${src.producer}:${src.source}`
                            const state = systemConnected ? (states.get(key) ?? 'none') : 'none'
                            return (
                                <span key={i} style={{
                                    fontSize: 10, padding: '1px 2px', borderRadius: 99,
                                    border: '0.5px solid', flexShrink: 0,
                                    ...SOURCE_CHIP_STYLE[state],
                                }}>
                                    {shortName(src.producer, src.source)}
                                </span>
                            )
                        })}
                    </div>
                )}
            </div>
            <span className="tag-pill">{device.consumer.name}</span>
            <IconChevronRight style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        </div>
    )
}
