import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/datetime";
import { ApiToken } from "@/lib/types";
import Notice from "./Notice";
import RoleNote from "./RoleNote";
import { useToast } from "@/contexts/ToastContext";

interface TokenDetailsProps {
  token: ApiToken;
  /** Only the create response carries it. */
  secret?: string | null;
}

export const isTokenExpired = (token: ApiToken) =>
  !!token.expires_at && new Date(token.expires_at).getTime() < Date.now();

/** The expiry pill placed beside the token's name, when it has expired. */
export function ExpiredTokenBadge({ token }: { token: ApiToken }) {
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
  token: ApiToken;
  /** Add the name row when the heading does not carry it. */
  showName?: boolean;
}

export function TokenMetadata({ token, showName = false }: TokenMetadataProps) {
  return (
    <div className="space-y-2">
      {showName && (
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-base text-gray-900 break-all">{token.name}</p>
        </div>
      )}
      {token.description && (
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Description</p>
          <p className="text-base text-gray-900 break-words">
            {token.description}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
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
  const toast = useToast();
  const [revealed, setRevealed] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRevealed(true);
    setCopied(false);
  }, [token, secret]);

  const handleCopy = async () => {
    if (!secret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      toast.error("Failed to copy the secret to the clipboard");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-800 break-all">
            {secret ? "API Token Created" : token.name}
          </h2>
          <ExpiredTokenBadge token={token} />
        </div>

        {secret && (
          <Notice tone="warning" className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-900">Secret</p>
              <div className="space-x-3 text-sm">
                <button
                  type="button"
                  onClick={() => setRevealed((prev) => !prev)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {revealed ? "Hide" : "Reveal"}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="font-medium text-green-600 hover:underline"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-900 font-mono break-all">
              {revealed ? secret : "•".repeat(secret.length)}
            </p>
            <p className="text-sm text-amber-800">
              Copy it now; it is shown only once.
            </p>
          </Notice>
        )}

        <TokenMetadata token={token} showName={!!secret} />
      </div>

      <RoleNote roleName={token.role_name} holder="token" />
    </div>
  );
}
