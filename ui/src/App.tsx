import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Middleware from "@/components/Middleware";
import Sidebar from "@/components/Sidebar";
import MenuIcon from "./components/icons/MenuIcon";

// Import page components
import LoginPage from "@/pages/LoginPage";
import ZonesPage from "@/pages/ZonesPage";
import RecordsPage from "@/pages/RecordsPage";
import SetupPage from "@/pages/SetupPage";
import GeneralSettingsPage from "@/pages/GeneralSettingsPage";
import DnsSettingsPage from "@/pages/DnsSettingsPage";

function App() {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const showSidebar = ["/records", "/zones", "/settings"].some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <AuthProvider>
      <Middleware>
        <div className="relative h-screen md:flex">
          {showSidebar && (
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="md:hidden absolute top-4 right-4 z-20 p-2 text-gray-500 bg-white rounded-md shadow-lg"
              aria-label="Toggle menu"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          )}
          {showSidebar && (
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          )}
          <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
            <Routes>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/zones" replace />} />
              <Route path="/zones" element={<ZonesPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route
                path="/settings"
                element={<Navigate to="/settings/general" replace />}
              />
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
