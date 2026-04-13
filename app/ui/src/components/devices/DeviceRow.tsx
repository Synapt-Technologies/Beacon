import { IconChevronRight } from '../icons'
import { UITallyDevice } from '../../types/DeviceStates'
import { DeviceTallyState } from '../../../../src/tally/types/ConsumerStates'

export default function DeviceRow({ device, onSelect }: { device: UITallyDevice; onSelect: () => void }) {
    return (
        <div
            className={`row-card tl-${DeviceTallyState[device.state].toLowerCase()}`}
            onClick={onSelect}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {device.name.long}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {device.patch.length === 0 ? 'No sources patched' : device.patch.map(s => s.source).join(', ')}
                </div>
            </div>
            <span className="tag-pill">{device.consumer.name}</span>
            <IconChevronRight style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        </div>
    )
}
