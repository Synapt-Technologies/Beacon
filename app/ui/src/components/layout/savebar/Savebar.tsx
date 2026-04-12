import { IconCheck } from '../../icons'

interface SavebarProps {
    onSave:    () => void
    onDiscard: () => void
}

export default function Savebar({ onSave, onDiscard }: SavebarProps) {
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
                style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 14px',
                    borderRadius: 'var(--border-radius-md)', border: 'none',
                    background: '#E24B4A', color: '#fff', cursor: 'pointer',
                }}
            >
                Discard
            </button>
            <button
                onClick={onSave}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 500, padding: '7px 16px',
                    borderRadius: 'var(--border-radius-md)', border: 'none',
                    background: '#1D9E75', color: '#fff', cursor: 'pointer',
                }}
            >
                <IconCheck size={13} />
                Save changes
            </button>
        </div>
    )
}
