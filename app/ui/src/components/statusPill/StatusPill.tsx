import "./statusPill.less";
import type { CSSProperties } from 'react';

export interface StatusPillRow {
    label: string;
    ok: boolean;
}

interface StatusPillProps {
    ok: boolean;
    text: string;
    hoverRows?: StatusPillRow[];
    disabled?: boolean;
    style?: CSSProperties;
}

export default function StatusPill({ ok, text, hoverRows = [], disabled = false, style }: StatusPillProps) {
    const showHoverMenu = !disabled && hoverRows.length > 0;
    const textColor = disabled
        ? 'var(--color-text-tertiary)'
        : ok
            ? 'var(--color-text-success)'
            : 'var(--color-text-warning)';
    const backgroundColor = disabled
        ? 'var(--color-background-secondary)'
        : ok
            ? 'var(--color-background-success)'
            : 'var(--color-background-warning)';

    return (
        <div style={{ position: 'relative', ...style }}>
            <div
                className="status-pill-wrap"
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                    color: textColor,
                    background: backgroundColor,
                    padding: '3px 10px', borderRadius: 99, cursor: disabled ? 'not-allowed' : 'default',
                }}
            >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                {text}

                {showHoverMenu && (
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
                        {hoverRows.map((row, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: row.ok ? '#1D9E75' : '#E24B4A' }} />
                                {row.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}