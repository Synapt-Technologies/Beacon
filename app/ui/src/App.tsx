import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SettingsPage from "./pages/SettingsPage";
import DevicesPage from "./pages/DevicesPage";
import { AppProvider } from "./context/AppContext";
import { BeaconProvider } from "./context/BeaconContext";
import OverviewPage from "./pages/OverviewPage";
import WebTallyPage from "./pages/WebTallyPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import './styles/global.css';

import Layout from "./components/layout/Layout";

export default function App() {
    return (
        <AppProvider>
            <BeaconProvider>
                <BrowserRouter>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route index element={<Navigate to="/overview" replace />} />
                            <Route path="overview" element={<OverviewPage />} />
                            <Route path="web-tally" element={<WebTallyPage />} />
                            <Route path="devices" element={<DevicesPage />} />
                            <Route path="connections" element={<ConnectionsPage />} />
                            {/* <Route path="devices" element={<ConsumersPage />} /> */}
                            {/* <Route path="connections" element={<ProducersPage />} /> */}
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </BeaconProvider>
        </AppProvider>
    );
}
