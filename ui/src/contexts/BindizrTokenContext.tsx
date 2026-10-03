import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getPermissions, getSelfToken, getSelfTokenGrants } from "@/lib/api";
import { grantCoversRecord, zoneKey } from "@/lib/grants";
import {
  Action,
  ApiToken,
  Permissions,
  PermittedActions,
  RoleGrant,
} from "@/lib/types";
import { useAuth } from "./AuthContext";

interface BindizrTokenContextType {
  /** The UI's own token; null when Bindizr runs without auth or the lookup failed. */
  self: ApiToken | null;
  /** Whether the caller may do `action` in the named zone, or in every zone
   * when none is named; true if the lookup failed, as the API decides. */
  allows: (action: Action, zoneName?: string) => boolean;
  /** Whether `record:create` reaches part of a zone, or of any zone when none
   * is named. */
  canCreateRecords: (zoneName?: string) => boolean;
  /** Whether a grant permits `action` on this record by zone, name pattern
   * and types. */
  canWriteRecord: (
    action: Action,
    record: { zone_name: string; name: string; type: string },
  ) => boolean;
  /** Whether the caller may do `action` in the zone with no name or type
   * limit. */
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
  /** Null when the lookup failed: everything is offered, the API decides. */
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  /** Only the record-level check reads grants; empty without a token. */
  const [grants, setGrants] = useState<RoleGrant[]>([]);
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    let token: ApiToken | null = null;

    try {
      token = await getSelfToken();
      setSelf(token);
    } catch {
      // 401 is auth disabled; anything else fails open.
      setSelf(null);
    }

    try {
      setPermissions(await getPermissions());
    } catch {
      setPermissions(null);
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

  /** A zone's permissions: its own entry, or the every-zone ones. */
  const zonePermissions = useMemo(() => {
    const byZone = new Map(
      (permissions?.zones ?? []).map((zone) => [zoneKey(zone.zone_name), zone]),
    );
    return (zoneName: string): PermittedActions | undefined =>
      byZone.get(zoneKey(zoneName)) ?? permissions?.all_zones;
  }, [permissions]);

  const allows = useCallback(
    (action: Action, zoneName?: string) => {
      const permitted =
        zoneName === undefined
          ? permissions?.all_zones
          : zonePermissions(zoneName);
      return !permitted || permitted.actions.includes(action);
    },
    [permissions, zonePermissions],
  );

  const canCreateRecords = useCallback(
    (zoneName?: string) =>
      zoneName !== undefined
        ? allows("record:create", zoneName)
        : !permissions ||
          [permissions.all_zones, ...permissions.zones].some((permitted) =>
            permitted.actions.includes("record:create"),
          ),
    [allows, permissions],
  );

  const canWriteRecord = useCallback(
    (
      action: Action,
      record: { zone_name: string; name: string; type: string },
    ) =>
      self === null ||
      grants.some((grant) => grantCoversRecord(grant, action, record)),
    [self, grants],
  );

  const allowsWholeZone = useCallback(
    (action: Action, zoneName: string) => {
      const permitted = zonePermissions(zoneName);
      return !permitted || permitted.whole_zone.includes(action);
    },
    [zonePermissions],
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
