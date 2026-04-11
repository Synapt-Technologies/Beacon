import { Outlet, useLocation } from "react-router-dom"
import { useEffect } from "react"
import Sidebar from "./sidebar/Sidebar"
import Header from "./header/Header"
import Savebar from "./savebar/Savebar"

const PAGE_TITLES: Record<string, string> = {
    '/overview':    'Tally overview',
    '/web-tally':   'Web tally',
    '/devices':     'Devices',
    '/connections': 'Connections',
    '/settings':    'Settings',
}


export default function Layout() {
    const location = useLocation();
    
    const title = PAGE_TITLES[location.pathname] ?? 'Beacon';
    
    useEffect(() => {
        document.title = title;
    }, [title]);

    return (
        <div className="app-shell">
            <Sidebar />

            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                background: 'var(--color-background-secondary)',
                overflow: 'hidden', position: 'relative',
            }}>
                <Header title={title}/>

                <main>
                    <Outlet />
                </main>

                <Savebar />
            </div>
        </div>
    );
    
}