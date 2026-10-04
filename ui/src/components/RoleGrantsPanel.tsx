import { useEffect, useState } from "react";
import {
  createRoleGrant,
  deleteRoleGrant,
  getRoleGrants,
  getZones,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { zoneKey } from "@/lib/grants";
import {
  ACTION_DESCRIPTIONS,
  ACTIONS,
  ALL_ZONES_ACTIONS,
  Action,
  Role,
  RoleGrant,
  Zone,
} from "@/lib/types";
import Notice from "./Notice";
import RoleGrantTable from "./RoleGrantTable";
import { useToast } from "@/contexts/ToastContext";

/** The panel's two views; any other tab of the parent shows nothing here. */
export type RoleGrantsView = "grants" | "grant";

interface RoleGrantsPanelProps {
  role: Role;
  view: RoleGrantsView | null;
  onViewChange: (view: RoleGrantsView) => void;
  /** Called after a grant or revoke, for a parent showing counts. */
  onChange: () => void;
}

/** The value the zone picker uses for a grant covering every zone. */
const EVERY_ZONE = "";

const DEFAULT_PATTERN = "*";
const DEFAULT_TYPES = "*";

/** Actions that act on no zone, so their grant always covers every zone. */
const SERVER_ACTIONS = ACTIONS.filter((action) =>
  ALL_ZONES_ACTIONS.includes(action),
);

/** The zone-scoped actions, grouped by the resource they act on. */
const ZONE_ACTION_GROUPS = ["zone", "record", "dnssec"].map((resource) => ({
  resource,
  actions: ACTIONS.filter(
    (action) =>
      action.startsWith(`${resource}:`) && !ALL_ZONES_ACTIONS.includes(action),
  ),
}));

const isRecordAction = (action: Action) => action.startsWith("record:");

/** The read each write needs before the UI can list what it acts on. */
const READ_FOR_WRITE: Partial<Record<Action, Action>> = {
  "record:create": "record:read",
  "record:update": "record:read",
  "record:delete": "record:read",
  "secondary:manage": "secondary:read",
  "dnssec:manage": "dnssec:read",
};

/** A role's grants and the form adding one, shown in the parent's tabs. */
export default function RoleGrantsPanel({
  role,
  view,
  onViewChange,
  onChange,
}: RoleGrantsPanelProps) {
  const toast = useToast();
  const [grants, setGrants] = useState<RoleGrant[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState(EVERY_ZONE);
  const [actions, setActions] = useState<Action[]>([]);
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [recordTypes, setRecordTypes] = useState(DEFAULT_TYPES);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchAll() {
      setLoading(true);
      setLoadError(null);
      setZonesError(null);
      // Independent: a broken zone list still shows the grants.
      const [grantsResult, zonesResult] = await Promise.allSettled([
        getRoleGrants(role.name),
        getZones(),
      ]);
      if (!active) {
        return;
      }
      if (grantsResult.status === "fulfilled") {
        setGrants(grantsResult.value);
      } else {
        setLoadError(
          getErrorMessage(grantsResult.reason, "Failed to fetch grants"),
        );
      }
      if (zonesResult.status === "fulfilled") {
        setZones(zonesResult.value);
      } else {
        setZonesError(
          getErrorMessage(zonesResult.reason, "Failed to fetch zones"),
        );
      }
      setLoading(false);
    }

    fetchAll();

    return () => {
      active = false;
    };
  }, [role.name]);

  const hasRecordAction = actions.some(isRecordAction);
  // Writes without their read stay usable through the API, as automation
  // wants, but the UI lists nothing for them to act on. Name and type
  // coverage is the server's to decide, so only an unconstrained read in
  // this zone settles it here; anything narrower keeps the hint.
  const coversNewGrant = (grant: RoleGrant, read: Action) =>
    grant.actions.includes(read) &&
    (grant.zone_name === null ||
      (zoneName !== EVERY_ZONE &&
        zoneKey(grant.zone_name) === zoneKey(zoneName))) &&
    (!isRecordAction(read) ||
      (grant.record_name_pattern === DEFAULT_PATTERN &&
        grant.record_types === DEFAULT_TYPES));
  const apiOnly = actions.filter((action) => {
    const read = READ_FOR_WRITE[action];
    return (
      read !== undefined &&
      !actions.includes(read) &&
      !grants.some((grant) => coversNewGrant(grant, read))
    );
  });
  const missingReads = [
    ...new Set(apiOnly.map((action) => READ_FOR_WRITE[action])),
  ];
  const serverActions = actions.filter((action) =>
    ALL_ZONES_ACTIONS.includes(action),
  );
  const zoneActions = actions.filter(
    (action) => !ALL_ZONES_ACTIONS.includes(action),
  );

  const toggleAction = (action: Action) => {
    setActions((prev) =>
      prev.includes(action)
        ? prev.filter((item) => item !== action)
        : [...prev, action],
    );
  };

  // A grant has one zone scope: server-wide actions always take every zone,
  // so they go in a grant of their own unless the zone pick is every zone.
  const zoneScoped = zoneName !== EVERY_ZONE && zoneActions.length > 0;
  const splitsInTwo = zoneScoped && serverActions.length > 0;
  // Without the zone list the scope would silently stay every zone.
  const zoneScopeUnknown = zonesError !== null && zoneActions.length > 0;

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();

    const requests = zoneScoped
      ? [
          ...(serverActions.length > 0
            ? [{ zone_name: null, actions: serverActions }]
            : []),
          { zone_name: zoneName, actions: zoneActions },
        ]
      : [{ zone_name: null, actions }];

    setSubmitting(true);
    try {
      for (const request of requests) {
        const recordGrant = request.actions.some(isRecordAction);
        const created = await createRoleGrant(role.name, {
          ...request,
          // Constraints narrow record actions only; the API refuses them otherwise.
          record_name_pattern: recordGrant
            ? pattern.trim() || DEFAULT_PATTERN
            : DEFAULT_PATTERN,
          record_types: recordGrant
            ? recordTypes.trim() || DEFAULT_TYPES
            : DEFAULT_TYPES,
        });
        setGrants((prev) => [...prev, created]);
        // Unticked as each lands, so a retry after a failure adds no duplicate.
        setActions((prev) =>
          prev.filter((action) => !created.actions.includes(action)),
        );
        onChange();
        toast.success(
          `Granted ${created.actions.join(", ")} in ${created.zone_name ?? "every zone"}.`,
        );
      }
      setZoneName(EVERY_ZONE);
      setPattern(DEFAULT_PATTERN);
      setRecordTypes(DEFAULT_TYPES);
      onViewChange("grants");
    } catch (grantError) {
      toast.error(getErrorMessage(grantError, "Failed to grant the role"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (grant: RoleGrant) => {
    if (
      !window.confirm(
        `Revoke ${grant.actions.join(", ")} in ${grant.zone_name ?? "every zone"} from "${role.name}"?`,
      )
    ) {
      return;
    }
    try {
      toast.success(await deleteRoleGrant(role.name, grant.id));
      setGrants((prev) => prev.filter((item) => item.id !== grant.id));
      onChange();
    } catch (revokeError) {
      toast.error(getErrorMessage(revokeError, "Failed to revoke the grant"));
    }
  };

  if (view === null) {
    return null;
  }

  return (
    <div className="space-y-4">
      {view === "grants" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {role.builtin
              ? "The built-in role permits every action in every zone and cannot be changed."
              : "Tokens and keys in this role may do what any one grant permits. The pattern and types narrow the record actions only."}
          </p>

          {loading ? (
            <p className="text-gray-500">Loading grants...</p>
          ) : loadError ? (
            <Notice tone="error">{loadError}</Notice>
          ) : grants.length === 0 ? (
            <p className="text-gray-500">No grants yet.</p>
          ) : (
            <RoleGrantTable
              grants={grants}
              onRevoke={role.builtin ? undefined : handleRevoke}
            />
          )}
        </div>
      )}

      {view === "grant" && (
        <form onSubmit={handleGrant} className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="block text-sm font-medium text-gray-600 mb-1">
              Server-wide
            </legend>
            <p className="text-xs text-gray-500">
              Not tied to a zone, so these always hold across the server.
            </p>
            {SERVER_ACTIONS.map((action) => (
              <label
                key={action}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={actions.includes(action)}
                  onChange={() => toggleAction(action)}
                  className="mt-1"
                />
                <span>
                  <code>{action}</code>
                  <span className="block text-xs text-gray-500">
                    {ACTION_DESCRIPTIONS[action]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-3 border-t border-gray-200 pt-4">
            <legend className="sr-only">Zone</legend>
            <div>
              <label
                htmlFor="grant_zone_name"
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                Zone
              </label>
              {zonesError ? (
                <Notice tone="error">
                  {zonesError}. Zone actions cannot be granted until the zone
                  list loads.
                </Notice>
              ) : (
                <select
                  id="grant_zone_name"
                  name="zone_name"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  disabled={loading}
                  className="w-full"
                >
                  <option value={EVERY_ZONE}>
                    Every zone, including zones created later
                  </option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.name}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-visible space-y-3 pr-1">
              {ZONE_ACTION_GROUPS.map((group) => (
                <div key={group.resource} className="space-y-2">
                  {group.actions.map((action) => (
                    <label
                      key={action}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={actions.includes(action)}
                        onChange={() => toggleAction(action)}
                        className="mt-1"
                      />
                      <span>
                        <code>{action}</code>
                        <span className="block text-xs text-gray-500">
                          {ACTION_DESCRIPTIONS[action]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </fieldset>

          {hasRecordAction && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="grant_record_name_pattern"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Record Name Pattern
                </label>
                <input
                  type="text"
                  id="grant_record_name_pattern"
                  name="record_name_pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="*"
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <code>*</code> any name, <code>@</code> apex,{" "}
                  <code>*.sub</code> subtree, or an exact relative name.
                </p>
              </div>
              <div>
                <label
                  htmlFor="grant_record_types"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Record Types
                </label>
                <input
                  type="text"
                  id="grant_record_types"
                  name="record_types"
                  value={recordTypes}
                  onChange={(e) => setRecordTypes(e.target.value)}
                  placeholder="*"
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <code>*</code> or a comma-separated list such as{" "}
                  <code>A,AAAA,TXT</code>.
                </p>
              </div>
            </div>
          )}

          {apiOnly.length > 0 && (
            <Notice tone="info">
              Unless another grant gives <code>{missingReads.join(", ")}</code>{" "}
              over the same records, <code>{apiOnly.join(", ")}</code> work
              through the API only: the UI lists nothing for them to act on.
            </Notice>
          )}

          <div className="flex items-center justify-end gap-3">
            {splitsInTwo && (
              <p className="text-xs text-gray-500">
                Adds two grants: the server-wide actions in every zone, the rest
                in {zoneName}.
              </p>
            )}
            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                actions.length === 0 ||
                zoneScopeUnknown
              }
              className="btn-primary"
            >
              {submitting ? "Granting..." : "Add Grant"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
