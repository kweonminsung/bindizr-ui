import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSelfToken, getSelfTokenGrants } from "@/lib/api";
import { ApiToken, TokenGrant } from "@/lib/types";
import { useAuth } from "./AuthContext";

interface BindizrTokenContextType {
  /** The UI's own token; null when Bindizr runs without auth or the lookup failed. */
  self: ApiToken | null;
  /** Zone-plane access: a global token, no auth, or an unresolved lookup. */
  globalAccess: boolean;
  /** Whether the token may write records in one zone, or in any when none
   * is named. A scoped token needs a read-write grant. */
  canWriteRecords: (zoneName?: string) => boolean;
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
  const [grants, setGrants] = useState<TokenGrant[]>([]);
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    let token: ApiToken | null = null;

    try {
      token = await getSelfToken();
      setSelf(token);
      setGlobalAccess(token.global);
    } catch {
      // 401 is auth disabled; anything else fails open.
      setSelf(null);
      setGlobalAccess(true);
    }

    // Read on its own: a failed lookup must not widen the token's scope, and
    // unknown grants offer no write the API would refuse. Global needs no list.
    try {
      setGrants(token && !token.global ? await getSelfTokenGrants() : []);
    } catch {
      setGrants([]);
    } finally {
      setResolved(true);
    }
  }, []);

  const canWriteRecords = useCallback(
    (zoneName?: string) =>
      globalAccess ||
      grants.some(
        (grant) =>
          grant.can_write && (!zoneName || grant.zone_name === zoneName),
      ),
    [globalAccess, grants],
  );

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
    <BindizrTokenContext.Provider
      value={{ self, globalAccess, canWriteRecords, refresh }}
    >
      {children}
    </BindizrTokenContext.Provider>
  );
};
