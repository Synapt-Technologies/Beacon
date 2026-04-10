import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProducersPage from "./pages/ProducersPage";
import ConsumersPage from "./pages/ConsumersPage";
import SettingsPage from "./pages/SettingsPage";
import DevicesPage from "./pages/DevicesPage";
import { AppProvider } from "./context/AppContext";

export default function App() {
    return (
        <AppProvider>
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Navigate to="/devices" replace />} />
                    <Route path="devices" element={<DevicesPage />} />
                    <Route path="producers" element={<ProducersPage />} />
                    <Route path="consumers" element={<ConsumersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
        </AppProvider>
    );
}
