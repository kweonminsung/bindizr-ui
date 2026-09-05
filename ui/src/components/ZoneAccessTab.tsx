import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getTokens,
  getTsigKeys,
  getZoneTokenGrants,
  getZoneTsigGrants,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { focusLink } from "@/lib/focusName";
import { Zone, ZoneGrant } from "@/lib/types";

interface ZoneAccessTabProps {
  zone: Zone;
}

interface AccessRow extends ZoneGrant {
  holder: string;
}

interface AccessSectionProps {
  title: string;
  description: string;
  holderLabel: string;
  /** Where grants are managed; rows deep-link into it. */
  managePath: string;
  manageLabel: string;
  rows: AccessRow[];
  /** Global holders need no grant, so they never appear in `rows`. */
  globals: string[];
}

function AccessSection({
  title,
  description,
  holderLabel,
  managePath,
  manageLabel,
  rows,
  globals,
}: AccessSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 mt-2">{description}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No {holderLabel.toLowerCase()} has been granted access to this zone.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {holderLabel}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="truncate px-3 py-2" title={row.holder}>
                    <Link
                      to={focusLink(managePath, row.holder)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {row.holder}
                    </Link>
                  </td>
                  <td
                    className="truncate px-3 py-2 font-mono text-gray-600"
                    title={row.record_name_pattern}
                  >
                    {row.record_name_pattern}
                  </td>
                  <td
                    className="truncate px-3 py-2 font-mono text-gray-600"
                    title={row.record_types}
                  >
                    {row.record_types}
                  </td>
                  <td className="hidden sm:table-cell truncate px-3 py-2 text-gray-500">
                    {formatDateTime(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {globals.length > 0 && (
        <p className="text-sm text-amber-800">
          Global {holderLabel}s cover this zone without a grant:{" "}
          {globals.map((name, index) => (
            <span key={name}>
              {index > 0 && ", "}
              <Link
                to={focusLink(managePath, name)}
                className="font-medium hover:underline"
              >
                {name}
              </Link>
            </span>
          ))}
          .
        </p>
      )}

      <p className="text-sm text-gray-500">
        Grants are managed on the{" "}
        <Link to={managePath} className="text-blue-600 hover:underline">
          {manageLabel}
        </Link>{" "}
        page: open a {holderLabel.toLowerCase()} there to grant or revoke its
        access.
      </p>
    </div>
  );
}

export default function ZoneAccessTab({ zone }: ZoneAccessTabProps) {
  const [tokenRows, setTokenRows] = useState<AccessRow[]>([]);
  const [tsigRows, setTsigRows] = useState<AccessRow[]>([]);
  const [globalTokens, setGlobalTokens] = useState<string[]>([]);
  const [globalKeys, setGlobalKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchAccess() {
      setLoading(true);
      setError(null);
      try {
        const [tokenGrants, tsigGrants, tokens, tsigKeys] = await Promise.all([
          getZoneTokenGrants(zone.name),
          getZoneTsigGrants(zone.name),
          getTokens(),
          getTsigKeys(),
        ]);
        if (active) {
          setTokenRows(
            tokenGrants.map((grant) => ({ ...grant, holder: grant.api_token })),
          );
          setTsigRows(
            tsigGrants.map((grant) => ({ ...grant, holder: grant.tsig_key })),
          );
          setGlobalTokens(
            tokens.filter((token) => token.global).map((token) => token.name),
          );
          setGlobalKeys(
            tsigKeys.filter((key) => key.global).map((key) => key.name),
          );
        }
      } catch (fetchError) {
        if (active) {
          setError(
            getErrorMessage(fetchError, "Failed to fetch the zone's access"),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchAccess();

    return () => {
      active = false;
    };
  }, [zone.name]);

  if (loading) {
    return <p className="text-gray-500">Loading zone access...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Who may reach this zone&apos;s records besides the UI. Access is granted
        per token or key; the name pattern and record types narrow only what may
        be written.
      </p>

      <AccessSection
        title="API Tokens"
        description="Scoped Tokens that can see this zone. Each reads every record here; its pattern and types restrict only what it may write."
        holderLabel="Token"
        managePath="/access/tokens"
        manageLabel="API Tokens"
        rows={tokenRows}
        globals={globalTokens}
      />

      <AccessSection
        title="TSIG Keys"
        description="Scoped Keys that may send dynamic updates (nsupdate) to this zone; the pattern and types restrict which updates are accepted."
        holderLabel="Key"
        managePath="/access/tsig-keys"
        manageLabel="TSIG Keys"
        rows={tsigRows}
        globals={globalKeys}
      />
    </div>
  );
}
