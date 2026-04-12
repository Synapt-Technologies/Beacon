import { Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import Sidebar from "./sidebar/Sidebar"
import Header from "./header/Header"

const PAGE_TITLES: Record<string, string> = {
    '/overview':    'Tally overview',
    '/web-tally':   'Web tally',
    '/devices':     'Devices',
    '/connections': 'Connections',
    '/settings':    'Settings',
}

const MOBILE_BREAKPOINT = 768

export default function Layout() {
    const location = useLocation()

    const [isMobile,   setIsMobile]   = useState(() => window.innerWidth < MOBILE_BREAKPOINT)
    const [mobileOpen, setMobileOpen] = useState(false)

    // Track viewport width changes
    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
        const handler = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches)
            if (!e.matches) setMobileOpen(false)
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    // Collapse sidebar on navigation (mobile)
    useEffect(() => {
        if (isMobile) setMobileOpen(false)
    }, [location.pathname, isMobile])

    // Page title
    const title = PAGE_TITLES[location.pathname] ?? 'Beacon'
    useEffect(() => { document.title = title }, [title])

    return (
        <div className="app-shell">

            {/* Mobile backdrop */}
            {isMobile && mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 29,
                        background: 'rgba(0,0,0,.4)',
                    }}
                />
            )}

            <Sidebar
                isMobile={isMobile}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
            />

            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                background: 'var(--color-background-secondary)',
                overflow: 'hidden', position: 'relative',
                minWidth: 0,
            }}>
                <Header
                    title={title}
                    isMobile={isMobile}
                    onMenuClick={() => setMobileOpen(true)}
                />

                <main style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
