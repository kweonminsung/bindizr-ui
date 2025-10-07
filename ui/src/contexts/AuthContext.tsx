import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setupComplete: boolean;
  accountEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [accountEnabled, setAccountEnabled] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if setup is complete and account is enabled
      const statusResponse = await fetch("/api/auth/status");
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setSetupComplete(status.setupComplete);
        setAccountEnabled(status.accountEnabled);

        if (status.setupComplete && status.accountEnabled) {
          // Check if user is authenticated
          const token = localStorage.getItem("auth_token");
          if (token) {
            const authResponse = await fetch("/api/auth/me", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            setIsAuthenticated(authResponse.ok);
            if (!authResponse.ok) {
              // Token is invalid, remove it
              localStorage.removeItem("auth_token");
            }
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(true); // No auth required
        }
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("auth_token");
      setIsAuthenticated(false);
    }
  };
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        setupComplete,
        accountEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
