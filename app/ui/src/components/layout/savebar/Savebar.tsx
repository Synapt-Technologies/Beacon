import { useBeacon } from "../../../context/BeaconContext";

import { IconCheck } from '../../icons'


export default function SaveBar() {
    const { settingsUnsaved, discardSettings, saveSettings } = useBeacon();

    return (
        <>
        {/* TODO add animation */}
            {settingsUnsaved && ( 
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
                    onClick={discardSettings}
                    style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 14px',
                    borderRadius: 'var(--border-radius-md)', border: 'none',
                    background: '#E24B4A', color: '#fff', cursor: 'pointer',
                    }}
                >
                    Discard
                </button>
                <button
                    onClick={saveSettings}
                    style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 500, padding: '7px 16px',
                    borderRadius: 'var(--border-radius-md)', border: 'none',
                    background: '#1D9E75', color: '#fff', cursor: 'pointer',
                    }}
                >
                    <IconCheck size={13} /> {/* TODO: Make this handle a promise */}
                    Save changes
                </button>
            </div>
        )}
    </>
    )
}