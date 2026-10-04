import { useEffect, useState } from "react";
import { getSelfTokenGrants } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ApiToken, RoleGrant } from "@/lib/types";
import { ExpiredTokenBadge, TokenMetadata } from "./TokenDetails";
import Notice from "./Notice";
import RoleGrantTable from "./RoleGrantTable";

interface ConnectedTokenDetailsProps {
  /** The token the UI presents to Bindizr. */
  token: ApiToken;
}

/** Modal body: the connected token's metadata and its role's grants. */
export default function ConnectedTokenDetails({
  token,
}: ConnectedTokenDetailsProps) {
  const [grants, setGrants] = useState<RoleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
              "Failed to fetch the token's role grants",
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
          <ExpiredTokenBadge token={token} />
        </div>
        <TokenMetadata token={token} />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
            Role Grants
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            What role {token.role_name} permits this token. The pattern and
            types narrow its record actions, for reads as much as writes.
          </p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading grants...</p>
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : grants.length === 0 ? (
          <p className="text-sm text-gray-500">The role holds no grants yet.</p>
        ) : (
          <RoleGrantTable grants={grants} />
        )}
      </div>
    </div>
  );
}
