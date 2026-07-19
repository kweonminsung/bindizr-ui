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

  if (!setupComplete) {
    if (location.pathname !== "/setup") {
      return <Navigate to="/setup" replace />;
    }
  } else if (location.pathname === "/setup") {
    return <Navigate to="/" replace />;
  }

  if (accountEnabled && !isAuthenticated) {
    if (location.pathname !== "/login") {
      return <Navigate to="/login" replace />;
    }
  } else if (location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default Middleware;
