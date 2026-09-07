import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSelfTokenGrants } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { ApiToken, TokenGrant } from "@/lib/types";
import { TokenBadges, TokenMetadata } from "./TokenDetails";
import Notice from "./Notice";

interface ConnectedTokenDetailsProps {
  /** The token the UI presents to Bindizr. */
  token: ApiToken;
}

/** Modal body: the connected token's metadata and the zones it may reach. */
export default function ConnectedTokenDetails({
  token,
}: ConnectedTokenDetailsProps) {
  const [grants, setGrants] = useState<TokenGrant[]>([]);
  const [loading, setLoading] = useState(!token.global);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Global tokens carry no grants; nothing to fetch.
    if (token.global) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    getSelfTokenGrants()
      .then((list) => {
        if (active) {
          setGrants(list);
        }
      })
      .catch((fetchError) => {
        if (active) {
          setError(
            getErrorMessage(
              fetchError,
              "Failed to fetch the token's zone access",
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-800 break-all">
            {token.name}
          </h2>
          <TokenBadges token={token} />
        </div>
        <TokenMetadata token={token} />
      </div>

      {token.global ? (
        <Notice tone="warning">
          This token is global: it manages every zone and needs no grants.
        </Notice>
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Zone Access
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              This token sees only the zones below. The pattern and types limit
              what it may write.
            </p>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading zone access...</p>
          ) : error ? (
            <Notice tone="error">{error}</Notice>
          ) : grants.length === 0 ? (
            <p className="text-sm text-gray-500">No zones granted yet.</p>
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
                      Granted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grants.map((grant) => (
                    <tr key={grant.id}>
                      <td
                        className="truncate px-3 py-2"
                        title={grant.zone_name}
                      >
                        <Link
                          to={`/records?zoneName=${encodeURIComponent(grant.zone_name)}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {grant.zone_name}
                        </Link>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
