import { useBeacon } from '../../context/BeaconContext'

import "./statusPill.less";

interface StatusRow { label: string; ok: boolean }

export default function StatusPill() {
    const { producers, consumers } = useBeacon();
    //TODO Don't include disabled, only errored.
    //   const rows: StatusRow[] = [
    //     ...producers.map(p => ({
    //       label: `${p.config.name ?? p.config.id} — ${p.info?.connected ? 'connected' : 'disconnected'}`,
    //       ok: p.info?.connected ?? false,
    //     })),
    //     { label: `GPIO hardware — ${consumers.gpio?.enabled ? 'active' : 'disabled'}`, ok: !!consumers.gpio?.enabled },
    //     { label: `MQTT broker — ${consumers.aedes?.enabled ? 'running' : 'disabled'}`, ok: !!consumers.aedes?.enabled },
    //   ]
    //TODO Better state handling!
    const rows: StatusRow[] = [
        { label: `GPIO hardware — disabled`, ok: false },
        { label: `MQTT broker — running`, ok: true }
    ]
    
    const allGood = rows.every(r => r.ok)
    
    return (
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <div
                className="status-pill-wrap"
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                    color: allGood ? 'var(--color-text-success)' : 'var(--color-text-warning)',
                    background: allGood ? 'var(--color-background-success)' : 'var(--color-background-warning)',
                    padding: '3px 10px', borderRadius: 99, cursor: 'default',
                }}
            >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                    {allGood ? 'All good' : 'Issues'}
            
                {/* Tooltip */}
                <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                        background: 'var(--color-background-primary)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '8px 12px', zIndex: 30, minWidth: 200,
                        pointerEvents: 'none',
                    }}
                    className="status-tooltip"
                >
                    {rows.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: r.ok ? '#1D9E75' : '#E24B4A' }} />
                            {r.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        )
    }