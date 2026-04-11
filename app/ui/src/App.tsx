import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProducersPage from "./pages/ProducersPage";
import ConsumersPage from "./pages/ConsumersPage";
import SettingsPage from "./pages/SettingsPage";
import DevicesPage from "./pages/DevicesPage";
import { AppProvider } from "./context/AppContext";
import OverviewPage from "./pages/OverviewPage";
import WebTallyPage from "./pages/WebTallyPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import './styles/global.css';

export default function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route index element={<Navigate to="/overview" replace />} />
                        <Route path="overview" element={<OverviewPage />} />
                        <Route path="web-tally" element={<WebTallyPage />} />
                        {/* <Route path="devices" element={<DevicesPage />} /> */}
                        {/* <Route path="connections" element={<ConnectionsPage />} /> */}
                        <Route path="devices" element={<ConsumersPage />} />
                        <Route path="connections" element={<ProducersPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AppProvider>
    );
}
