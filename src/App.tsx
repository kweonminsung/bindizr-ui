import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LayoutWrapper from "@/components/LayoutWrapper";

// Import page components
import LoginPage from "@/pages/LoginPage";
import ZonesPage from "@/pages/ZonesPage";
import RecordsPage from "@/pages/RecordsPage";
import SetupPage from "@/pages/SetupPage";
import GeneralSettingsPage from "@/pages/GeneralSettingsPage";
import DnsSettingsPage from "@/pages/DnsSettingsPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Navigate to="/zones" replace />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/zones"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <ZonesPage />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <RecordsPage />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/general"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <GeneralSettingsPage />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/dns"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <DnsSettingsPage />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
