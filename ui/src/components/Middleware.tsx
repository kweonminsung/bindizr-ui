import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface MiddlewareProps {
  children: React.ReactNode;
}

const Middleware: React.FC<MiddlewareProps> = ({ children }) => {
  const { isAuthenticated, isLoading, setupComplete, accountEnabled } =
    useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Setup routing logic
  if (!setupComplete) {
    // Only allow access to setup page
    if (location.pathname !== "/setup") {
      return <Navigate to="/setup" replace />;
    }
  } else {
    // Setup is complete, don't allow access to setup page
    if (location.pathname === "/setup") {
      return <Navigate to="/" replace />;
    }
  }

  // Authentication routing logic
  if (accountEnabled) {
    if (!isAuthenticated) {
      // User not authenticated, only allow access to login page
      if (location.pathname !== "/login") {
        return <Navigate to="/login" replace />;
      }
    } else {
      // User is authenticated, don't allow access to login page
      if (location.pathname === "/login") {
        return <Navigate to="/" replace />;
      }
    }
  } else {
    // Accounts are disabled, don't allow access to login page
    if (location.pathname === "/login") {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default Middleware;
