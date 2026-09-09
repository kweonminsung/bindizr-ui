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
import Notice from "./Notice";
import { isTokenExpired } from "./TokenDetails";

interface ZoneAccessTabProps {
  zone: Zone;
}

interface AccessRow extends ZoneGrant {
  holder: string;
  /** The holder can no longer use this grant. */
  expired?: boolean;
}

interface AccessSectionProps {
  title: string;
  description: string;
  holderLabel: string;
  /** Where grants are managed; rows deep-link into it. */
  managePath: string;
  manageLabel: string;
  rows: AccessRow[];
  /** Unexpired global holders need no grant, so they never appear in `rows`. */
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
                    {row.expired && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Expired
                      </span>
                    )}
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
        <Notice tone="warning">
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
        </Notice>
      )}

      <p className="text-sm text-gray-500">
        Manage grants on the{" "}
        <Link to={managePath} className="text-blue-600 hover:underline">
          {manageLabel}
        </Link>{" "}
        page.
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
          const expiredTokens = new Set(
            tokens.filter(isTokenExpired).map((token) => token.name),
          );
          setTokenRows(
            tokenGrants.map((grant) => ({
              ...grant,
              holder: grant.api_token,
              expired: expiredTokens.has(grant.api_token),
            })),
          );
          setTsigRows(
            tsigGrants.map((grant) => ({ ...grant, holder: grant.tsig_key })),
          );
          setGlobalTokens(
            tokens
              .filter((token) => token.global && !isTokenExpired(token))
              .map((token) => token.name),
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
    return <Notice tone="error">{error}</Notice>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Tokens and keys with access to this zone. The pattern and types limit
        writes only.
      </p>

      <AccessSection
        title="API Tokens"
        description="Scoped Tokens with access to this zone."
        holderLabel="Token"
        managePath="/access/tokens"
        manageLabel="API Tokens"
        rows={tokenRows}
        globals={globalTokens}
      />

      <AccessSection
        title="TSIG Keys"
        description="Scoped Keys that may send dynamic updates to this zone."
        holderLabel="Key"
        managePath="/access/tsig-keys"
        manageLabel="TSIG Keys"
        rows={tsigRows}
        globals={globalKeys}
      />
    </div>
  );
}
