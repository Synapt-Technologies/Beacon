import { useState } from "react";
import Logo from "../../logo/Logo";
import SectionLabel from "./SectionLabel";
import SidebarItem from "./SidebarItem";
import CollapseButton from "./CollapseButton";
import { IconGrid, IconCircleDot, IconOutput, IconConnections, IconSettings } from '../../icons'

interface SidebarProps {
    isMobile:   boolean
    mobileOpen: boolean
    onClose:    () => void
}

function NavItems({ collapsed }: { collapsed: boolean }) {
    return (
        <nav style={{ flex: 1, padding: '6px 0', overflow: 'hidden' }}>
            <SectionLabel collapsed={collapsed}>Monitor</SectionLabel>
            <SidebarItem to="/devices"     icon={<IconGrid />}          label="Devices"     collapsed={collapsed} />
            <SidebarItem to="/sources"   icon={<IconCircleDot />}       label="Sources"     collapsed={collapsed} />

            <SectionLabel collapsed={collapsed}>Configure</SectionLabel>
            <SidebarItem to="/connections" icon={<IconConnections />}   label="Connections" collapsed={collapsed} />
            <SidebarItem to="/settings"    icon={<IconSettings />}      label="Settings"    collapsed={collapsed} />
        </nav>
    )
}

export default function Sidebar({ isMobile, mobileOpen, onClose }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)

    if (isMobile) {
        return (
            <aside style={{
                position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 30,
                width: 216,
                background: 'var(--color-background-primary)',
                borderRight: '0.5px solid var(--color-border-tertiary)',
                display: 'flex', flexDirection: 'column',
                transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
            }}>
                <Logo collapsed={false} />
                <NavItems collapsed={false} />
                <div style={{ padding: 10, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 6, padding: 7,
                            border: '0.5px solid var(--color-border-tertiary)',
                            borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
                            color: 'var(--color-text-secondary)', background: 'none',
                            fontSize: 12,
                        }}
                    >
                        Close
                    </button>
                </div>
            </aside>
        )
    }

    return (
        <aside
            className="sidebar"
            style={{
                width: collapsed ? 56 : 216,
                background: 'var(--color-background-primary)',
                borderRight: '0.5px solid var(--color-border-tertiary)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
                transition: 'width .2s cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
            }}
        >
            <Logo collapsed={collapsed} />
            <NavItems collapsed={collapsed} />
            <CollapseButton collapsed={collapsed} setCollapsed={setCollapsed} />
        </aside>
    )
}
