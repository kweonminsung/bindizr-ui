import { formatDateTime } from "@/lib/datetime";
import { ApiTokenResponse } from "@/lib/types";
import CredentialSecret from "./CredentialSecret";
import RoleNote from "./RoleNote";

interface TokenDetailsProps {
  token: ApiTokenResponse;
  /** Only the create response carries it. */
  secret?: string | null;
}

export const isTokenExpired = (token: ApiTokenResponse) =>
  !!token.expires_at && new Date(token.expires_at).getTime() < Date.now();

/** The expiry pill placed beside the token's name, when it has expired. */
export function ExpiredTokenBadge({ token }: { token: ApiTokenResponse }) {
  if (!isTokenExpired(token)) {
    return null;
  }
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      Expired
    </span>
  );
}

interface TokenMetadataProps {
  token: ApiTokenResponse;
  /** Add the name row when the heading does not carry it. */
  showName?: boolean;
}

export function TokenMetadata({ token, showName = false }: TokenMetadataProps) {
  return (
    <div className="space-y-2">
      {showName && (
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-base text-gray-900 wrap-anywhere">{token.name}</p>
        </div>
      )}
      {token.description && (
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Description</p>
          <p className="text-base text-gray-900 wrap-anywhere">
            {token.description}
          </p>
        </div>
      )}
      <div className="grid gap-2 @xs:grid-cols-2 @xl:grid-cols-3">
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Expires</p>
          <p className="text-base text-gray-900">
            {token.expires_at ? formatDateTime(token.expires_at) : "Never"}
          </p>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Last Used</p>
          <p className="text-base text-gray-900">
            {token.last_used_at ? formatDateTime(token.last_used_at) : "Never"}
          </p>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-base text-gray-900">
            {formatDateTime(token.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TokenDetails({ token, secret }: TokenDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-800 wrap-anywhere">
            {secret ? "API Token Created" : token.name}
          </h2>
          <ExpiredTokenBadge token={token} />
        </div>

        {secret && (
          <CredentialSecret
            key={token.id}
            secret={secret}
            initiallyRevealed
            shownOnce
          />
        )}

        <TokenMetadata token={token} showName={!!secret} />
      </div>

      <RoleNote roleName={token.role_name} holder="token" />
    </div>
  );
}
