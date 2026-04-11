import { useState } from "react";
import Logo from "../../logo/Logo";
import SectionLabel from "./SectionLabel";
import SidebarItem from "./SidebarItem";
import CollapseButton from "./CollapseButton";
import { IconGrid, IconCircleDot, IconOutput, IconConnections, IconSettings } from '../../icons'



export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false); // TODO: Mobile default collapse and collapse on press

    return (
        <aside 
            className="sidebar"
            style={{
                width: collapsed ? 56 : 216,
                background: 'var(--color-background-primary)',
                borderRight: '0.5px solid var(--color-border-tertiary)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
                transition: 'width .2s cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
            }}>

            <Logo collapsed={collapsed}/>

            <nav style={{ flex: 1, padding: '6px 0', overflow: 'hidden' }}>
                <SectionLabel collapsed={collapsed}>Monitor</SectionLabel>
                <SidebarItem to="/overview"    icon={<IconGrid />}        label="Tally overview" collapsed={collapsed} />
                <SidebarItem to="/web-tally"   icon={<IconCircleDot />}   label="Web tally"      collapsed={collapsed} />

                <SectionLabel collapsed={collapsed}>Configure</SectionLabel>
                <SidebarItem to="/devices"     icon={<IconOutput />}      label="Devices"        collapsed={collapsed} />
                <SidebarItem to="/connections" icon={<IconConnections />} label="Connections"    collapsed={collapsed} />
                <SidebarItem to="/settings"    icon={<IconSettings />}    label="Settings"       collapsed={collapsed} />
            </nav>

            <CollapseButton collapsed={collapsed} setCollapsed={setCollapsed} />
        </aside>
    );
}