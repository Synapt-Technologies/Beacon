import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { StatusPill } from './StatusPill'
import { useApp } from '../context/AppContext'
import { IconCheck } from './icons'

const PAGE_TITLES: Record<string, string> = {
  '/overview':    'Tally overview',
  '/web-tally':  'Web tally',
  '/devices':    'Devices',
  '/connections':'Connections',
  '/settings':   'Settings',
}

export default function Layout() {
  const location = useLocation()
  const { settingsDirty, saveSettings, discardSettings } = useApp()

  const title = PAGE_TITLES[location.pathname] ?? 'Beacon'

  return (
    <div className="app-shell">
      <Sidebar />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--color-background-secondary)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Topbar */}
        <div style={{
          padding: '0 18px', height: 52,
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {title}
          </span>
          <StatusPill />
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          <Outlet />
        </div>

        {/* Floating save bar — shown when settings are dirty */}
        {settingsDirty && (
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
              <IconCheck size={13} />
              Save changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}