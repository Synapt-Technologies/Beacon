import { NavLink } from 'react-router-dom'

interface SavebarItemProps {
  to: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
}


export default function SidebarItem(
  { to, icon, label, collapsed }: { to: string, icon: React.ReactNode, label: string, collapsed: boolean }
) {
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