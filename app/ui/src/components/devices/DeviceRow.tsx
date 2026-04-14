import { IconChevronRight } from '../icons'
import { UITallyDevice } from '../../types/DeviceStates'
import { stateFromValue, type DeviceDisplayState } from '../../types/beacon'
import { useBeacon } from '../../context/BeaconContext'
import type { SourceInfo } from '../../../../src/tally/types/ProducerStates'

type SourceState = 'pgm' | 'pvw' | 'none'

const SOURCE_CHIP_STYLE: Record<SourceState, object> = {
    pgm:  { background: 'none', color: 'var(--pgm)', borderColor: 'transparent' },
    pvw:  { background: 'none', color: 'var(--pvw)', borderColor: 'transparent' },
    none: { background: 'none', color: 'var(--color-text-tertiary)', borderColor: 'transparent' },
}

export default function DeviceRow({
    device,
    onSelect,
    tallyStates,
}: {
    device: UITallyDevice
    onSelect: () => void
    tallyStates?: Map<string, SourceState>
}) {
    const { producers } = useBeacon()

    const liveState: DeviceDisplayState = tallyStates
        ? (device.patch.some(s => tallyStates.get(`${s.producer}:${s.source}`) === 'pgm') ? 'pgm'
          : device.patch.some(s => tallyStates.get(`${s.producer}:${s.source}`) === 'pvw') ? 'pvw'
          : stateFromValue(device.state))
        : stateFromValue(device.state)

    function shortName(producer: string, source: string): string {
        const key = `${producer}:${source}`
        for (const p of producers) {
            const sources = p.info?.sources as unknown as Record<string, SourceInfo>
            if (sources?.[key]) return sources[key].short ?? source
        }
        return source
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
                ) : tallyStates ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                        {device.patch.map((src, i) => {
                            const key = `${src.producer}:${src.source}`
                            const state = tallyStates.get(key) ?? 'none'
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
                ) : (
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {device.patch.map(s => s.source).join(', ')}
                    </div>
                )}
            </div>
            <span className="tag-pill">{device.consumer.name}</span>
            <IconChevronRight style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        </div>
    )
}
