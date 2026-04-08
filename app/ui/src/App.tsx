import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProducersPage from "./pages/ProducersPage";
import ConsumersPage from "./pages/ConsumersPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Navigate to="/producers" replace />} />
                    <Route path="producers" element={<ProducersPage />} />
                    <Route path="consumers" element={<ConsumersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
