import { useBeacon } from '../../context/BeaconContext';
import StatusPill, { type StatusPillRow } from './StatusPill';
import { CONSUMER_META } from '../../config/consumers';

export default function GlobalStatusPill() {
    const { producers, consumers } = useBeacon();
    const rows: StatusPillRow[] = [
        ...producers
            .filter(p => p.enabled)
            .map(p => ({
                label: `${p.config.name ?? p.config.id} — ${p.info.status}`,
                ok: p.info.status === 'Online',
            })),
    ];

    for (const [id, consumer] of Object.entries(consumers)) {
        if (!consumer?.enabled) continue;
        const meta = CONSUMER_META[id as keyof typeof CONSUMER_META];
        const status = consumer.info?.status ?? 'Offline';
        rows.push({
            label: `${meta?.label ?? id} — ${status}`,
            ok: status === 'Online',
        });
    }

    const allGood = rows.every(row => row.ok);

    return (
        <StatusPill
            ok={allGood}
            text={allGood ? 'All good' : 'Issues'}
            hoverRows={rows}
            style={{ marginLeft: 'auto' }}
        />
    );
}