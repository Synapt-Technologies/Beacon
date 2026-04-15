import { Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { BeaconProvider } from "./context/BeaconContext";
import { TallyStateProvider } from "./context/TallyStateContext";
import Layout from "./components/layout/Layout";
import OverviewPage from "./pages/OverviewPage";
import WebTallyPage from "./pages/WebTallyPage";
import DevicesPage from "./pages/DevicesPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import SettingsPage from "./pages/SettingsPage";
import UpdatePage from "./pages/UpdatePage";
import './styles/global.css';

// Error boundary that catches render crashes caused by Vite HMR context
// identity mismatches (e.g. BeaconContext recreated mid-reload during an update).
// Rather than reloading immediately (which races with server restart), we poll
// the API until the server is confirmed ready, then do a clean reload.
class AppErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean; error: string | null }
> {
    state = { hasError: false, error: null }
    private _poll?: ReturnType<typeof setInterval>

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message }
    }

    componentDidUpdate(_: unknown, prev: { hasError: boolean }) {
        if (!prev.hasError && this.state.hasError) {
            this._poll = setInterval(async () => {
                try {
                    await fetch('/api/update/status')
                    window.location.reload()
                } catch {
                    // server not ready yet — keep waiting
                }
            }, 2000)
        }
    }

    componentWillUnmount() {
        if (this._poll) clearInterval(this._poll)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100dvh', gap: 8,
                background: 'var(--color-background-primary)',
            }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    Reconnecting…
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    Waiting for the server to come back up.
                </div>
                {this.state.error && (
                    <div style={{
                        marginTop: 12, padding: '8px 12px', borderRadius: 6, maxWidth: 420,
                        background: 'color-mix(in srgb, #E24B4A 10%, transparent)',
                        border: '0.5px solid color-mix(in srgb, #E24B4A 40%, transparent)',
                        fontSize: 11, color: '#E24B4A', textAlign: 'center', wordBreak: 'break-word',
                    }}>
                        {this.state.error}
                    </div>
                )}
            </div>
        )
    }
}

export default function App() {
    return (
        <AppErrorBoundary>
        <BeaconProvider>
          <TallyStateProvider>
            <Toaster
                position="top-right"
                containerStyle={{ top: 70, right: 14 }}
                toastOptions={{
                    style: {
                        background: 'var(--color-background-primary)',
                        color: 'var(--color-text-primary)',
                        border: '0.5px solid var(--color-border-secondary)',
                        fontSize: 13,
                    },
                    error: { duration: 5000 },
                }}
            />
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route index element={<Navigate to="/overview" replace />} />

                        <Route path="overview" element={<OverviewPage />} />
                        <Route path="overview/:consumer/:device" element={<OverviewPage />} />
                        <Route path="overview/:consumer/:device/fullscreen" element={<OverviewPage />} />

                        <Route path="web-tally" element={<WebTallyPage />} />
                        <Route path="web-tally/:producer/:source" element={<WebTallyPage />} />
                        <Route path="web-tally/:producer/:source/fullscreen" element={<WebTallyPage />} />

                        <Route path="devices" element={<DevicesPage />} />
                        <Route path="devices/:consumer/:device" element={<DevicesPage />} />
                        <Route path="devices/:consumer/:device/fullscreen" element={<DevicesPage />} />

                        <Route path="connections" element={<ConnectionsPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="settings/update" element={<UpdatePage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
          </TallyStateProvider>
        </BeaconProvider>
        </AppErrorBoundary>
    );
}
