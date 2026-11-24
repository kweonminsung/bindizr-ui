import { ReactElement, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
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
import RolesPage from "@/pages/RolesPage";
import TokensPage from "@/pages/TokensPage";
import TsigKeysPage from "@/pages/TsigKeysPage";
import SecondariesPage from "@/pages/SecondariesPage";
import DnssecPoliciesPage from "@/pages/DnssecPoliciesPage";
import DnssecZonesPage from "@/pages/DnssecZonesPage";
import AccessLogPage from "@/pages/AccessLogPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import TransferLogPage from "@/pages/TransferLogPage";
import SetupPage from "@/pages/SetupPage";
import SettingsPage from "@/pages/SettingsPage";
import WebhooksPage from "@/pages/WebhooksPage";
import { Action } from "@/lib/types";

/** A page the token's role must permit `action` in all zones to open. */
function RequireAction({
  action,
  children,
}: {
  action: Action;
  children: ReactElement;
}) {
  const { allows } = useBindizrToken();
  return allows(action) ? children : <Navigate to="/zones" replace />;
}

function App() {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const showSidebar = [
    "/records",
    "/zones",
    "/dnssec",
    "/secondaries",
    "/access",
    "/logs",
    "/settings",
  ].some((path) => location.pathname.startsWith(path));

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const closeSidebar = () => {
    setSidebarOpen(false);
    if (isSidebarOpen) menuButtonRef.current?.focus();
  };

  return (
    <ToastProvider>
      <AuthProvider>
        <Middleware>
          <BindizrTokenProvider>
            <div className="flex h-dvh flex-col md:flex-row">
              {showSidebar && (
                <header className="flex shrink-0 justify-end px-4 pt-3 sm:px-8 md:hidden">
                  <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setSidebarOpen((open) => !open)}
                    onKeyDown={(event) => {
                      if (isSidebarOpen && event.key === "Escape")
                        closeSidebar();
                    }}
                    className="rounded-md border border-gray-200 bg-white p-2 text-gray-600"
                    aria-label="Toggle menu"
                    aria-expanded={isSidebarOpen}
                    aria-controls="app-sidebar"
                  >
                    <MenuIcon className="size-6" />
                  </button>
                </header>
              )}
              {showSidebar && (
                <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
              )}
              <main
                ref={mainRef}
                className={`min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-8 ${
                  showSidebar
                    ? "bg-gray-50/70 pt-3 sm:pt-4 md:pt-8"
                    : "flex flex-col"
                }`}
              >
                <div
                  className={
                    showSidebar ? "mx-auto w-full max-w-[90rem]" : "contents"
                  }
                >
                  <Routes>
                    <Route path="/setup" element={<SetupPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                      path="/"
                      element={<Navigate to="/zones" replace />}
                    />
                    <Route path="/zones" element={<ZonesPage />} />
                    <Route path="/records" element={<RecordsPage />} />
                    <Route
                      path="/dnssec"
                      element={<Navigate to="/dnssec/zones" replace />}
                    />
                    <Route
                      path="/dnssec/zones"
                      element={
                        <RequireAction action="dnssec:read">
                          <DnssecZonesPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/dnssec/policies"
                      element={
                        <RequireAction action="dnssec:read">
                          <DnssecPoliciesPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/dnssec-policies"
                      element={<Navigate to="/dnssec/policies" replace />}
                    />
                    <Route
                      path="/secondaries"
                      element={
                        <RequireAction action="secondary:read">
                          <SecondariesPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/logs"
                      element={<Navigate to="/logs/activity" replace />}
                    />
                    <Route
                      path="/log/activity"
                      element={
                        <Navigate
                          to={{
                            pathname: "/logs/activity",
                            search: location.search,
                            hash: location.hash,
                          }}
                          replace
                        />
                      }
                    />
                    <Route
                      path="/logs/activity"
                      element={
                        <RequireAction action="log:read">
                          <ActivityLogPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/logs/access"
                      element={
                        <RequireAction action="log:read">
                          <AccessLogPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/logs/transfer"
                      element={
                        <RequireAction action="log:read">
                          <TransferLogPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/dns"
                      element={<Navigate to="/dnssec/policies" replace />}
                    />
                    <Route
                      path="/dns/dnssec-policies"
                      element={<Navigate to="/dnssec/policies" replace />}
                    />
                    <Route
                      path="/dns/notify"
                      element={<Navigate to="/zones" replace />}
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
                        <RequireAction action="access:manage">
                          <TokensPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/access/tsig-keys"
                      element={
                        <RequireAction action="access:manage">
                          <TsigKeysPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/access/roles"
                      element={
                        <RequireAction action="access:manage">
                          <RolesPage />
                        </RequireAction>
                      }
                    />
                    <Route
                      path="/settings"
                      element={<Navigate to="/settings/general" replace />}
                    />
                    <Route
                      path="/settings/general"
                      element={<SettingsPage />}
                    />
                    <Route
                      path="/settings/webhooks"
                      element={<WebhooksPage />}
                    />
                    <Route
                      path="/settings/dns"
                      element={<Navigate to="/zones" replace />}
                    />
                  </Routes>
                </div>
              </main>
            </div>
          </BindizrTokenProvider>
        </Middleware>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
