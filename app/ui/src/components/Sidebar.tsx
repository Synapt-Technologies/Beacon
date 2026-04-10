import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  IconBeacon, IconGrid, IconCircleDot,
  IconOutput, IconConnections, IconSettings, IconCollapse,
} from './icons'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
}

function NavItem({ to, icon, label, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        position: 'relative',
        whiteSpace: 'nowrap',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        background: isActive ? 'var(--color-background-secondary)' : 'transparent',
        textDecoration: 'none',
        fontSize: 13,
        userSelect: 'none',
        transition: 'background .1s, color .1s',
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span style={{
              position: 'absolute', left: 0, top: 5, bottom: 5, width: 3,
              borderRadius: '0 2px 2px 0', background: 'var(--acc)',
            }} />
          )}
          <span style={{
            width: 28, height: 28, flexShrink: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', borderRadius: 6,
            background: isActive ? 'color-mix(in srgb, var(--acc) 12%, transparent)' : 'transparent',
          }}>
            {icon}
          </span>
          <span style={{ transition: 'opacity .15s', opacity: collapsed ? 0 : 1 }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase', letterSpacing: '.08em',
      padding: '10px 14px 4px', whiteSpace: 'nowrap',
      opacity: collapsed ? 0 : 1, transition: 'opacity .15s',
    }}>
      {children}
    </div>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{
      width: collapsed ? 56 : 216,
      background: 'var(--color-background-primary)',
      borderRight: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      transition: 'width .2s cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
    }}>
      {/* Logo */}
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

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 0', overflow: 'hidden' }}>
        <SectionLabel collapsed={collapsed}>Monitor</SectionLabel>
        <NavItem to="/overview"    icon={<IconGrid />}        label="Tally overview" collapsed={collapsed} />
        <NavItem to="/web-tally"   icon={<IconCircleDot />}   label="Web tally"      collapsed={collapsed} />

        <SectionLabel collapsed={collapsed}>Configure</SectionLabel>
        <NavItem to="/devices"     icon={<IconOutput />}      label="Devices"        collapsed={collapsed} />
        <NavItem to="/connections" icon={<IconConnections />} label="Connections"    collapsed={collapsed} />
        <NavItem to="/settings"    icon={<IconSettings />}    label="Settings"       collapsed={collapsed} />
      </nav>

      {/* Collapse button */}
      <div style={{ padding: 10, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
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
          <span style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "100%", transition: 'opacity .25s, width .25s' }}>
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}