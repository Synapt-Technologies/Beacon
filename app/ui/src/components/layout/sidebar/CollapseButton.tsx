
import { Dispatch, SetStateAction } from 'react';
import { IconCollapse } from '../../icons'


export default function CollapseButton({collapsed, setCollapsed}: {collapsed: boolean, setCollapsed: Dispatch<SetStateAction<boolean>>}){

    return (
        <div style={{ padding: 10, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 0, padding: 7,
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
            color: 'var(--color-text-secondary)', background: 'none',
            fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden',
            }}
        >
            <IconCollapse flipped={!collapsed} />
            <span style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "100%", transition: 'opacity .2s cubic-bezier(.4,0,.2,1), width .2s cubic-bezier(.4,0,.2,1)' }}>
            Collapse
            </span>
        </button>
        </div>
    );
}