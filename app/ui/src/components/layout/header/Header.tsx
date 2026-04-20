import GlobalStatusPill from "../../statusPill/GlobalStatusPill"

interface HeaderProps {
    title:       string
    isMobile:    boolean
    onMenuClick: () => void
}

export default function Header({ title, isMobile, onMenuClick }: HeaderProps) {
    return (
        <div style={{
            padding: '0 18px', height: 56,
            display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 10,
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            background: 'var(--color-background-primary)', flexShrink: 0,
        }}>
            {isMobile && (
                <button
                    onClick={onMenuClick}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, flexShrink: 0,
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 'var(--border-radius-md)',
                        background: 'none', cursor: 'pointer',
                        color: 'var(--color-text-secondary)',
                    }}
                    aria-label="Open menu"
                >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <rect y="2"  width="15" height="1.5" rx=".75" fill="currentColor"/>
                        <rect y="7"  width="15" height="1.5" rx=".75" fill="currentColor"/>
                        <rect y="12" width="15" height="1.5" rx=".75" fill="currentColor"/>
                    </svg>
                </button>
            )}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
                {title}
            </span>
            <GlobalStatusPill />
        </div>
    )
}
