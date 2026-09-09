import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSelfToken } from "@/lib/api";
import { ApiToken } from "@/lib/types";
import { useAuth } from "./AuthContext";

interface BindizrTokenContextType {
  /** The UI's own token; null when Bindizr runs without auth or the lookup failed. */
  self: ApiToken | null;
  /** Zone-plane access: a global token, no auth, or an unresolved lookup. */
  globalAccess: boolean;
  /** Re-read after the Bindizr settings change. */
  refresh: () => Promise<void>;
}

const BindizrTokenContext = createContext<BindizrTokenContextType | undefined>(
  undefined,
);

export const useBindizrToken = () => {
  const context = useContext(BindizrTokenContext);
  if (context === undefined) {
    throw new Error(
      "useBindizrToken must be used within a BindizrTokenProvider",
    );
  }
  return context;
};

interface BindizrTokenProviderProps {
  children: React.ReactNode;
}

export const BindizrTokenProvider: React.FC<BindizrTokenProviderProps> = ({
  children,
}) => {
  const { isAuthenticated, setupComplete, accountEnabled } = useAuth();
  const canLookup = setupComplete && (!accountEnabled || isAuthenticated);
  const [self, setSelf] = useState<ApiToken | null>(null);
  const [globalAccess, setGlobalAccess] = useState(true);
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const token = await getSelfToken();
      setSelf(token);
      setGlobalAccess(token.global);
    } catch {
      // 401 is auth disabled; anything else fails open.
      setSelf(null);
      setGlobalAccess(true);
    } finally {
      setResolved(true);
    }
  }, []);

  useEffect(() => {
    if (!canLookup) {
      setResolved(false);
      return;
    }
    refresh();
  }, [canLookup, refresh]);

  // Hold the UI until the scope is known.
  if (canLookup && !resolved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <BindizrTokenContext.Provider value={{ self, globalAccess, refresh }}>
      {children}
    </BindizrTokenContext.Provider>
  );
};
