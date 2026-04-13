import { IconCheck } from '../../icons'

interface SavebarProps {
    onSave:    () => void
    onDiscard: () => void
    saving?:   boolean
}

export default function Savebar({ onSave, onDiscard, saving }: SavebarProps) {
    return (
        <div style={{
            position: 'absolute', bottom: 14, left: 14, right: 14,
            padding: '10px 14px',
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 'var(--border-radius-lg)',
            display: 'flex', alignItems: 'center', gap: 10,
            zIndex: 5,
        }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Unsaved changes
            </span>
            <button
                onClick={onDiscard}
                disabled={saving}
                style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 14px',
                    borderRadius: 'var(--border-radius-md)', border: 'none',
                    background: '#E24B4A', color: '#fff',
                    cursor: saving ? 'default' : 'pointer',
                    opacity: saving ? 0.5 : 1,
                }}
            >
                Discard
            </button>
            <button
                onClick={saving ? undefined : onSave}
                disabled={saving}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 500, padding: '7px 16px',
                    borderRadius: 'var(--border-radius-md)', border: 'none',
                    background: '#1D9E75', color: '#fff',
                    cursor: saving ? 'default' : 'pointer',
                    opacity: saving ? 0.8 : 1,
                    minWidth: 110, justifyContent: 'center',
                }}
            >
                {saving ? (
                    <>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin .7s linear infinite' }}>
                            <circle cx="6.5" cy="6.5" r="5" stroke="rgba(255,255,255,.35)" strokeWidth="1.5"/>
                            <path d="M6.5 1.5A5 5 0 0 1 11.5 6.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Saving…
                    </>
                ) : (
                    <>
                        <IconCheck size={13} />
                        Save changes
                    </>
                )}
            </button>
        </div>
    )
}
