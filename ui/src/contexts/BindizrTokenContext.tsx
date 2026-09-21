import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSelfToken, getSelfTokenGrants } from "@/lib/api";
import { grantCoversRecord, isSameZone } from "@/lib/grants";
import { ApiToken, TokenGrant } from "@/lib/types";
import { useAuth } from "./AuthContext";

interface BindizrTokenContextType {
  /** The UI's own token; null when Bindizr runs without auth or the lookup failed. */
  self: ApiToken | null;
  /** Zone-plane access: a global token, no auth, or an unresolved lookup. */
  globalAccess: boolean;
  /** Whether some read-write grant reaches part of a zone, or of any zone
   * when none is named. The name typed in decides the rest, and only the
   * API can settle that. */
  canCreateRecords: (zoneName?: string) => boolean;
  /** Whether a read-write grant's zone, name pattern and types reach this
   * record. */
  canWriteRecord: (record: {
    zone_name: string;
    name: string;
    type: string;
  }) => boolean;
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

  const canCreateRecords = useCallback(
    (zoneName?: string) =>
      globalAccess ||
      grants.some(
        (grant) =>
          grant.can_write &&
          (!zoneName || isSameZone(grant.zone_name, zoneName)),
      ),
    [globalAccess, grants],
  );

  const canWriteRecord = useCallback(
    (record: { zone_name: string; name: string; type: string }) =>
      globalAccess ||
      grants.some(
        (grant) => grant.can_write && grantCoversRecord(grant, record),
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
      value={{ self, globalAccess, canCreateRecords, canWriteRecord, refresh }}
    >
      {children}
    </BindizrTokenContext.Provider>
  );
};
