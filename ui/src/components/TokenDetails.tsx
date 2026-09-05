import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/datetime";
import { ApiToken } from "@/lib/types";
import ZoneGrantsPanel from "./ZoneGrantsPanel";

interface TokenDetailsProps {
  token: ApiToken;
  /** Only the create response carries it. */
  secret?: string | null;
}

export const isTokenExpired = (token: ApiToken) =>
  !!token.expires_at && new Date(token.expires_at).getTime() < Date.now();

export default function TokenDetails({ token, secret }: TokenDetailsProps) {
  const [revealed, setRevealed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    setRevealed(true);
    setCopied(false);
    setCopyError(null);
  }, [token, secret]);

  const handleCopy = async () => {
    if (!secret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopyError("Failed to copy the secret to the clipboard");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-800 break-all">
            {secret ? "API Token Created" : token.name}
          </h2>
          {token.global ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Global
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Scoped
            </span>
          )}
          {isTokenExpired(token) && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Expired
            </span>
          )}
        </div>

        {secret && (
          <div className="p-3 rounded-md border border-amber-200 bg-amber-50 space-y-2">
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
              Copy it now: the secret is shown this once and cannot be retrieved
              later.
            </p>
            {copyError && <p className="text-sm text-red-700">{copyError}</p>}
          </div>
        )}

        <div className="space-y-2">
          {secret && (
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
                {token.last_used_at
                  ? formatDateTime(token.last_used_at)
                  : "Never"}
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
      </div>

      {token.global ? (
        <p className="p-3 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-800">
          This token is global: it manages every zone and the zone plane, and
          never carries grants.
        </p>
      ) : (
        <ZoneGrantsPanel kind="token" holderName={token.name} />
      )}
    </div>
  );
}
