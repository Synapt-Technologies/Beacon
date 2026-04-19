import { Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Sidebar from "./sidebar/Sidebar"
import Header from "./header/Header"
import { useTallyState } from "../../hooks/useTallyState"

const CONNECTION_TOAST_ID = 'beacon-connection'

const PAGE_TITLES: Record<string, string> = {
    '/overview':    'Tally overview',
    '/web-tally':   'Web tally',
    '/devices':     'Devices',
    '/connections': 'Connections',
    '/settings':        'Settings',
    '/settings/update': 'Update',
}

const MOBILE_BREAKPOINT = 768

export default function Layout() {
    const location = useLocation()

    const [isMobile,   setIsMobile]   = useState(() => window.innerWidth < MOBILE_BREAKPOINT)
    const [mobileOpen, setMobileOpen] = useState(false)

    const { connected, systemConnected } = useTallyState()

    useEffect(() => {
        if (systemConnected) {
            toast.dismiss(CONNECTION_TOAST_ID)
            return
        }
        const hard = !connected
        toast.custom(
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 'var(--border-radius-md)',
                background: hard ? 'var(--color-text-danger)' : 'var(--color-text-warning)',
                color: '#fff', fontSize: 12, fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1L12 11.5H1L6.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <line x1="6.5" y1="5" x2="6.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="6.5" cy="9.8" r=".6" fill="currentColor"/>
                </svg>
                {hard
                    ? 'Connection lost. Reconnecting...'
                    : 'Reconnecting...'}
            </div>,
            { id: CONNECTION_TOAST_ID, duration: Infinity },
        )
    }, [systemConnected, connected])

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
    const title = PAGE_TITLES[location.pathname] ? `Beacon - ${PAGE_TITLES[location.pathname]}` : 'Beacon'
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
