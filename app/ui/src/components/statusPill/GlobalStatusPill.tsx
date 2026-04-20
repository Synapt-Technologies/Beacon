import { useBeacon } from '../../context/BeaconContext';
import StatusPill, { type StatusPillRow } from './StatusPill';

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

    if (consumers.gpio?.enabled) {
        rows.push({ label: 'GPIO hardware — active', ok: true });
    }
    if (consumers.aedes?.enabled) {
        rows.push({ label: 'MQTT broker — running', ok: true });
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