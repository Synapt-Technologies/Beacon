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

export default function App() {
    return (
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
    );
}
