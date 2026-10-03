import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSelfToken, getSelfTokenGrants } from "@/lib/api";
import {
  grantCoversRecord,
  grantCoversWholeZone,
  grantReachesZone,
} from "@/lib/grants";
import { Action, ApiToken, RoleGrant } from "@/lib/types";
import { useAuth } from "./AuthContext";

interface BindizrTokenContextType {
  /** The UI's own token; null when Bindizr runs without auth or the lookup failed. */
  self: ApiToken | null;
  /** Whether the token's role permits `action` in the named zone, or — with
   * no zone named — in every zone, as actions no zone owns need. Always true
   * without auth or when the lookup failed. */
  allows: (action: Action, zoneName?: string) => boolean;
  /** Whether some `record:create` grant reaches part of a zone, or of any zone
   * when none is named. The name typed in decides the rest, and only the API
   * can settle that. */
  canCreateRecords: (zoneName?: string) => boolean;
  /** Whether a grant permits `action` on this record by zone, name pattern
   * and types. */
  canWriteRecord: (
    action: Action,
    record: { zone_name: string; name: string; type: string },
  ) => boolean;
  /** Whether a grant permits `action` in the zone with no name or type limit:
   * version detail, diffs and rollback need the whole zone. */
  allowsWholeZone: (action: Action, zoneName: string) => boolean;
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
  /** No token to scope by: auth is off, or the lookup failed open. */
  const [unrestricted, setUnrestricted] = useState(true);
  const [grants, setGrants] = useState<RoleGrant[]>([]);
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    let token: ApiToken | null = null;

    try {
      token = await getSelfToken();
      setSelf(token);
      setUnrestricted(false);
    } catch {
      // 401 is auth disabled; anything else fails open.
      setSelf(null);
      setUnrestricted(true);
    }

    // Read on its own: a failed lookup must not widen the token's scope, and
    // unknown grants offer no write the API would refuse.
    try {
      setGrants(token ? await getSelfTokenGrants() : []);
    } catch {
      setGrants([]);
    } finally {
      setResolved(true);
    }
  }, []);

  const allows = useCallback(
    (action: Action, zoneName?: string) =>
      unrestricted ||
      grants.some(
        (grant) =>
          grant.actions.includes(action) &&
          (zoneName === undefined
            ? grant.zone_name === null
            : grantReachesZone(grant, zoneName)),
      ),
    [unrestricted, grants],
  );

  const canCreateRecords = useCallback(
    (zoneName?: string) =>
      unrestricted ||
      grants.some(
        (grant) =>
          grant.actions.includes("record:create") &&
          (!zoneName || grantReachesZone(grant, zoneName)),
      ),
    [unrestricted, grants],
  );

  const canWriteRecord = useCallback(
    (
      action: Action,
      record: { zone_name: string; name: string; type: string },
    ) =>
      unrestricted ||
      grants.some((grant) => grantCoversRecord(grant, action, record)),
    [unrestricted, grants],
  );

  const allowsWholeZone = useCallback(
    (action: Action, zoneName: string) =>
      unrestricted ||
      grants.some((grant) => grantCoversWholeZone(grant, action, zoneName)),
    [unrestricted, grants],
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
      value={{
        self,
        allows,
        canCreateRecords,
        canWriteRecord,
        allowsWholeZone,
        refresh,
      }}
    >
      {children}
    </BindizrTokenContext.Provider>
  );
};
