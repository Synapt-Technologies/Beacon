import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BeaconProvider } from "./context/BeaconContext";
import Layout from "./components/layout/Layout";
import OverviewPage from "./pages/OverviewPage";
import WebTallyPage from "./pages/WebTallyPage";
import DevicesPage from "./pages/DevicesPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import SettingsPage from "./pages/SettingsPage";
import './styles/global.css';

export default function App() {
    return (
        <BeaconProvider>
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
                    </Route>
                </Routes>
            </BrowserRouter>
        </BeaconProvider>
    );
}
