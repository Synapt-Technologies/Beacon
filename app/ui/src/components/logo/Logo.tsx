import { IconBeacon } from "../icons";



export default function Logo({collapsed }: {collapsed: boolean}) {
    return(
        <div style={{
            padding: '15px 14px', display: 'flex', alignItems: 'center',
            gap: 10, height: 56, borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}>
        <div style={{
            width: 28, height: 28, flexShrink: 0, background: 'var(--acc)',
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <IconBeacon size={16} />
        </div>
        <span style={{
            fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap', opacity: collapsed ? 0 : 1, transition: 'opacity .15s',
        }}>
            Beacon
        </span>
        </div>
    )
}