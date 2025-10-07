import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Middleware from "@/components/Middleware";
import Sidebar from "@/components/Sidebar";

// Import page components
import LoginPage from "@/pages/LoginPage";
import ZonesPage from "@/pages/ZonesPage";
import RecordsPage from "@/pages/RecordsPage";
import SetupPage from "@/pages/SetupPage";
import GeneralSettingsPage from "@/pages/GeneralSettingsPage";
import DnsSettingsPage from "@/pages/DnsSettingsPage";

function App() {
  const location = useLocation();
  const showSidebar = ["/records", "/zones", "/settings"].some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <AuthProvider>
      <Middleware>
        <div className="flex h-screen bg-gray-100">
          {showSidebar && <Sidebar />}
          <main className="flex-1 p-8 overflow-y-auto">
            <Routes>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/zones" replace />} />
              <Route path="/zones" element={<ZonesPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route
                path="/settings/general"
                element={<GeneralSettingsPage />}
              />
              <Route path="/settings/dns" element={<DnsSettingsPage />} />
            </Routes>
          </main>
        </div>
      </Middleware>
    </AuthProvider>
  );
}

export default App;
