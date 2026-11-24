import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";

interface CredentialSecretProps {
  secret?: string | null;
  loading?: boolean;
  initiallyRevealed?: boolean;
  shownOnce?: boolean;
}

export default function CredentialSecret({
  secret,
  loading = false,
  initiallyRevealed = false,
  shownOnce = false,
}: CredentialSecretProps) {
  const toast = useToast();
  const [revealed, setRevealed] = useState(initiallyRevealed);
  const [copied, setCopied] = useState(false);

  const copySecret = async () => {
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
    <section
      aria-label="Secret"
      className={`space-y-2 rounded-md border p-3 text-sm ${
        shownOnce
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-gray-200 bg-gray-50 text-gray-700"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Secret</p>
        {secret && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRevealed((current) => !current)}
              className="font-medium text-blue-600 hover:underline"
            >
              {revealed ? "Hide" : "Reveal"}
            </button>
            <button
              type="button"
              onClick={copySecret}
              className="font-medium text-blue-600 hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
      <p className="font-mono text-gray-900 wrap-anywhere">
        {loading
          ? "Loading..."
          : !secret
            ? "-"
            : revealed
              ? secret
              : "•".repeat(secret.length)}
      </p>
      {shownOnce && <p>Copy it now; it is shown only once.</p>}
    </section>
  );
}
