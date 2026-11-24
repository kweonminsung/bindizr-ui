import { useEffect, useState } from "react";
import { exportZone } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ZoneResponse } from "@/lib/types";
import Notice from "./Notice";
import { useToast } from "@/contexts/ToastContext";

interface ZoneExportProps {
  zone: ZoneResponse;
}

export default function ZoneExport({ zone }: ZoneExportProps) {
  const toast = useToast();
  const [content, setContent] = useState("");
  const [includeDnssec, setIncludeDnssec] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchExport() {
      setLoading(true);
      setError(null);
      try {
        const text = await exportZone(zone.name, includeDnssec);
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
  }, [zone.name, includeDnssec]);

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
      setCopied(true);
    } catch {
      setCopied(false);
      toast.error("Failed to copy to the clipboard");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${zone.name}${includeDnssec ? ".signed" : ""}.zone`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
          Export zone
        </h2>
        <p className="text-sm text-gray-500 wrap-anywhere">{zone.name}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-gray-500">
          The zone rendered as BIND zone file text.
        </p>
        {!loading && !error && (
          <div className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-sm">
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

      <label
        title="Append the derived DNSSEC records (DNSKEY, RRSIG, the denial chain, CDS/CDNSKEY); an inspection artifact, not an import input"
        className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer"
      >
        <input
          type="checkbox"
          checked={includeDnssec}
          onChange={(e) => setIncludeDnssec(e.target.checked)}
        />
        <span className="border-b border-dotted border-gray-400 cursor-help">
          Include generated DNSSEC records
        </span>
      </label>

      {loading ? (
        <p className="text-gray-500">Exporting...</p>
      ) : error ? (
        <Notice tone="error">{error}</Notice>
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
