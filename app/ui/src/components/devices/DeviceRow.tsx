import { Dispatch, SetStateAction } from 'react';
import { IconChevronRight } from '../icons';
import { UIDevice } from '../../types/beacon';


export default function DeviceRow({device, setSelected}: {device: UIDevice, setSelected: Dispatch<SetStateAction<UIDevice>>}) {
    return (
        <div
        key={device.key}
        className={`row-card tl-${device.state}`}
        onClick={() => setSelected(device)}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {device.long}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {device.patch.length === 0 ? 'No sources patched' : device.patch.map(s => s.source).join(', ')}
            </div>
            </div>
                <span className="tag-pill">{device.consumerName}</span>
            <IconChevronRight style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        </div>
    );
}