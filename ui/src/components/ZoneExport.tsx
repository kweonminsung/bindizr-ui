import { useEffect, useState } from "react";
import { exportZone } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Zone } from "@/lib/types";

interface ZoneExportProps {
  zone: Zone;
}

export default function ZoneExport({ zone }: ZoneExportProps) {
  const [content, setContent] = useState("");
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Kept apart from `error`, which hides the exported text when it is set.
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchExport() {
      setLoading(true);
      setError(null);
      try {
        const text = await exportZone(zone.name, signed);
        if (active) {
          setContent(text);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to export zone"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchExport();

    return () => {
      active = false;
    };
  }, [zone.name, signed]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyError(null);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError("Failed to copy to the clipboard");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${zone.name}${signed ? ".signed" : ""}.zone`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-gray-800 break-all">
          Export {zone.name}
        </h2>
        {!loading && !error && (
          <div className="shrink-0 space-x-3 text-sm">
            <button
              type="button"
              onClick={handleCopy}
              className="font-medium text-green-600 hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="font-medium text-blue-600 hover:underline"
            >
              Download
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        The zone rendered as BIND master-file text.
      </p>

      <label
        title="Append the derived DNSSEC records (DNSKEY, RRSIG, the denial chain, CDS/CDNSKEY); an inspection artifact, not an import input"
        className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer"
      >
        <input
          type="checkbox"
          checked={signed}
          onChange={(e) => setSigned(e.target.checked)}
        />
        <span className="border-b border-dotted border-gray-400 cursor-help">
          Signed view
        </span>
      </label>

      {copyError && <p className="text-sm text-red-500">{copyError}</p>}

      {loading ? (
        <p className="text-gray-500">Exporting...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <textarea
          readOnly
          value={content}
          rows={16}
          className="w-full font-mono text-sm"
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}
