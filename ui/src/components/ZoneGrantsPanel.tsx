import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTokenGrant,
  createTsigGrant,
  deleteTokenGrant,
  deleteTsigGrant,
  getTokenGrants,
  getTsigGrants,
  getZones,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { CreateZoneGrantPayload, Zone, ZoneGrant } from "@/lib/types";
import TabBar from "./TabBar";

/** Whose grants these are. */
export type GrantHolderKind = "token" | "tsig-key";

interface ZoneGrantsPanelProps {
  kind: GrantHolderKind;
  holderName: string;
}

interface GrantApi {
  list: (holder: string) => Promise<ZoneGrant[]>;
  create: (
    holder: string,
    payload: CreateZoneGrantPayload,
  ) => Promise<ZoneGrant>;
  revoke: (holder: string, id: number) => Promise<void>;
}

const GRANT_API: Record<GrantHolderKind, GrantApi> = {
  token: {
    list: getTokenGrants,
    create: createTokenGrant,
    revoke: deleteTokenGrant,
  },
  "tsig-key": {
    list: getTsigGrants,
    create: createTsigGrant,
    revoke: deleteTsigGrant,
  },
};

const HOLDER_LABEL: Record<GrantHolderKind, string> = {
  token: "token",
  "tsig-key": "key",
};

const GRANT_NOTE: Record<GrantHolderKind, string> = {
  token:
    "Each grant makes one zone visible to this token, which then reads every record in it. The name pattern and record types restrict writes only. Without a grant the token sees no zone at all.",
  "tsig-key":
    "Each grant lets this key send dynamic updates (nsupdate) to one zone. The name pattern and record types restrict which updates are accepted; every record in an update must match a grant. Without a grant the key can update nothing.",
};

const GRANT_FORM_NOTE: Record<GrantHolderKind, string> = {
  token:
    "Pick a zone, then narrow what this token may write in it. Reads are never narrowed: a granted zone is readable in full.",
  "tsig-key": "Pick a zone, then narrow which updates this key may send to it.",
};

const DEFAULT_PATTERN = "*";
const DEFAULT_TYPES = "*";

type PanelTab = "grants" | "grant";

export default function ZoneGrantsPanel({
  kind,
  holderName,
}: ZoneGrantsPanelProps) {
  const api = GRANT_API[kind];
  const holder = HOLDER_LABEL[kind];
  const writeOnlyHint = kind === "token" ? " Restricts writes only." : null;
  const [tab, setTab] = useState<PanelTab>("grants");
  const [grants, setGrants] = useState<ZoneGrant[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [recordTypes, setRecordTypes] = useState(DEFAULT_TYPES);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchAll() {
      setLoading(true);
      setLoadError(null);
      setZonesError(null);
      setActionError(null);
      setNotice(null);
      setTab("grants");
      // Independent: a broken zone list still shows the grants.
      const [grantsResult, zonesResult] = await Promise.allSettled([
        api.list(holderName),
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
  }, [api, holderName]);

  const handleTabChange = (next: PanelTab) => {
    setTab(next);
    setActionError(null);
    setNotice(null);
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setActionError(null);
    try {
      const created = await api.create(holderName, {
        zone_name: zoneName,
        record_name_pattern: pattern.trim() || DEFAULT_PATTERN,
        record_types: recordTypes.trim() || DEFAULT_TYPES,
      });
      setGrants((prev) => [...prev, created]);
      setZoneName("");
      setPattern(DEFAULT_PATTERN);
      setRecordTypes(DEFAULT_TYPES);
      setNotice(`Granted access to "${created.zone_name}".`);
      setTab("grants");
    } catch (grantError) {
      setActionError(
        getErrorMessage(grantError, "Failed to grant zone access"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (grant: ZoneGrant) => {
    if (
      !window.confirm(
        `Revoke this ${holder}'s access to "${grant.zone_name}" (${grant.record_name_pattern}, ${grant.record_types})?`,
      )
    ) {
      return;
    }

    setActionError(null);
    setNotice(null);
    try {
      await api.revoke(holderName, grant.id);
      setGrants((prev) => prev.filter((item) => item.id !== grant.id));
    } catch (revokeError) {
      setActionError(
        getErrorMessage(revokeError, "Failed to revoke the grant"),
      );
    }
  };

  const tabs = [
    {
      id: "grants" as const,
      label:
        loading || loadError ? "Zone Access" : `Zone Access (${grants.length})`,
    },
    { id: "grant" as const, label: "Grant Access" },
  ];

  const errorBanner = actionError && (
    <p className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
      {actionError}
    </p>
  );

  return (
    <div className="space-y-4">
      <TabBar tabs={tabs} active={tab} onChange={handleTabChange} />

      {tab === "grants" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{GRANT_NOTE[kind]}</p>

          {notice && (
            <p className="p-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-800">
              {notice}
            </p>
          )}
          {errorBanner}

          {loading ? (
            <p className="text-gray-500">Loading grants...</p>
          ) : loadError ? (
            <p className="text-red-500">{loadError}</p>
          ) : grants.length === 0 ? (
            <p className="text-gray-500">
              This {holder} has no zone access yet. Add some from the Grant
              Access tab.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zone
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pattern
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Types
                    </th>
                    <th className="hidden sm:table-cell px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="w-20 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grants.map((grant) => (
                    <tr key={grant.id}>
                      <td
                        className="truncate px-3 py-2 font-medium text-gray-900"
                        title={grant.zone_name}
                      >
                        {grant.zone_name}
                      </td>
                      <td
                        className="truncate px-3 py-2 font-mono text-gray-600"
                        title={grant.record_name_pattern}
                      >
                        {grant.record_name_pattern}
                      </td>
                      <td
                        className="truncate px-3 py-2 font-mono text-gray-600"
                        title={grant.record_types}
                      >
                        {grant.record_types}
                      </td>
                      <td className="hidden sm:table-cell truncate px-3 py-2 text-gray-500">
                        {formatDateTime(grant.created_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevoke(grant)}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "grant" && (
        <form onSubmit={handleGrant} className="space-y-4">
          <p className="text-sm text-gray-500">
            {GRANT_FORM_NOTE[kind]} A zone can be granted more than once with
            different patterns.
          </p>
          <div>
            <label
              htmlFor="grant_zone_name"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Zone
            </label>
            {zonesError ? (
              <p className="text-sm text-red-600">{zonesError}</p>
            ) : (
              <select
                id="grant_zone_name"
                name="zone_name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              >
                <option value="">
                  {loading ? "Loading zones..." : "Select a zone"}
                </option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.name}>
                    {zone.name}
                  </option>
                ))}
              </select>
            )}
            {!loading && !zonesError && zones.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No zones yet.{" "}
                <Link to="/zones" className="text-blue-600 hover:underline">
                  Create one first
                </Link>
                .
              </p>
            )}
          </div>
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
                <code>*</code> any name, <code>@</code> apex, <code>*.sub</code>{" "}
                subtree, or an exact relative name.
                {writeOnlyHint}
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
                <code>A,AAAA,TXT</code>.{writeOnlyHint}
              </p>
            </div>
          </div>

          {errorBanner}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                submitting || loading || !!zonesError || zones.length === 0
              }
              className="btn-primary"
            >
              {submitting ? "Granting..." : "Grant Access"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
