import { ReactElement, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  BindizrTokenProvider,
  useBindizrToken,
} from "@/contexts/BindizrTokenContext";
import Middleware from "@/components/Middleware";
import Sidebar from "@/components/Sidebar";
import MenuIcon from "./components/icons/MenuIcon";
import LoginPage from "@/pages/LoginPage";
import ZonesPage from "@/pages/ZonesPage";
import RecordsPage from "@/pages/RecordsPage";
import TokensPage from "@/pages/TokensPage";
import TsigKeysPage from "@/pages/TsigKeysPage";
import DnssecPoliciesPage from "@/pages/DnssecPoliciesPage";
import SetupPage from "@/pages/SetupPage";
import SettingsPage from "@/pages/SettingsPage";
import NotifyPage from "@/pages/NotifyPage";

/** Pages a scoped token is refused. */
function GlobalOnly({ children }: { children: ReactElement }) {
  const { globalAccess } = useBindizrToken();
  return globalAccess ? children : <Navigate to="/zones" replace />;
}

function App() {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const showSidebar = [
    "/records",
    "/zones",
    "/dns",
    "/access",
    "/settings",
  ].some((path) => location.pathname.startsWith(path));

  return (
    <AuthProvider>
      <Middleware>
        <BindizrTokenProvider>
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
                  path="/dns"
                  element={<Navigate to="/dns/dnssec-policies" replace />}
                />
                <Route
                  path="/dns/dnssec-policies"
                  element={
                    <GlobalOnly>
                      <DnssecPoliciesPage />
                    </GlobalOnly>
                  }
                />
                <Route
                  path="/dns/notify"
                  element={
                    <GlobalOnly>
                      <NotifyPage />
                    </GlobalOnly>
                  }
                />
                <Route
                  path="/dns/tsig-keys"
                  element={<Navigate to="/access/tsig-keys" replace />}
                />
                <Route
                  path="/access"
                  element={<Navigate to="/access/tokens" replace />}
                />
                <Route
                  path="/access/tokens"
                  element={
                    <GlobalOnly>
                      <TokensPage />
                    </GlobalOnly>
                  }
                />
                <Route
                  path="/access/tsig-keys"
                  element={
                    <GlobalOnly>
                      <TsigKeysPage />
                    </GlobalOnly>
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/settings/general"
                  element={<Navigate to="/settings" replace />}
                />
                <Route
                  path="/settings/dns"
                  element={<Navigate to="/dns/notify" replace />}
                />
              </Routes>
            </main>
          </div>
        </BindizrTokenProvider>
      </Middleware>
    </AuthProvider>
  );
}

export default App;
