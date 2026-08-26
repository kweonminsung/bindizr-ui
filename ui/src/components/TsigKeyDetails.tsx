import { useEffect, useState } from "react";
import { getTsigKey } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { TsigKey } from "@/lib/types";

interface TsigKeyDetailsProps {
  tsigKey: TsigKey;
  isNew?: boolean;
}

export default function TsigKeyDetails({
  tsigKey,
  isNew = false,
}: TsigKeyDetailsProps) {
  const [detail, setDetail] = useState(tsigKey);
  const [revealed, setRevealed] = useState(isNew);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDetail(tsigKey);
    setRevealed(isNew);
    setCopied(false);
    setError(null);

    // The list response omits secrets, so fetch the key on its own to read one.
    if (tsigKey.secret) {
      return;
    }

    let active = true;
    setLoading(true);
    getTsigKey(tsigKey.name)
      .then((fetched) => {
        if (active) {
          setDetail(fetched);
        }
      })
      .catch((fetchError) => {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch TSIG key"));
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
  }, [tsigKey, isNew]);

  const handleCopy = async () => {
    if (!detail.secret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(detail.secret);
      setCopied(true);
    } catch {
      setError("Failed to copy the secret to the clipboard");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {isNew ? "TSIG Key Created" : "TSIG Key Details"}
      </h2>

      <div className="space-y-2">
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-base text-gray-900 break-all">{detail.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Algorithm</p>
            <p className="text-base text-gray-900">{detail.algorithm}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Scope</p>
            <p className="text-base text-gray-900">
              {detail.global ? "Global (all zones)" : "Policy-based"}
            </p>
          </div>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-base text-gray-900">
            {formatDateTime(detail.created_at)}
          </p>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Secret</p>
            {detail.secret && (
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
            )}
          </div>
          <p className="text-sm text-gray-900 font-mono break-all mt-1">
            {loading
              ? "Loading..."
              : !detail.secret
                ? "-"
                : revealed
                  ? detail.secret
                  : "•".repeat(detail.secret.length)}
          </p>
        </div>
      </div>

      {detail.global && (
        <p className="p-3 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-800">
          This key may update every name and type in every zone without a
          policy.
        </p>
      )}

      {error && (
        <p className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
