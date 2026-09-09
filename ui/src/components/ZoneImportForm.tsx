import { useState } from "react";
import { importZone } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { IMPORT_MODES, ImportMode, ImportZoneResult, Zone } from "@/lib/types";
import Notice from "./Notice";
import { useToast } from "@/contexts/ToastContext";

interface ZoneImportFormProps {
  zone: Zone;
  onApplied: () => void;
}

const MODE_DESCRIPTIONS: Record<ImportMode, string> = {
  append: "Only add records that do not exist yet.",
  upsert: "Add new records and update TTLs of existing ones.",
  replace: "Make the zone match the file exactly, deleting extra records.",
};

export default function ZoneImportForm({
  zone,
  onApplied,
}: ZoneImportFormProps) {
  const toast = useToast();
  const [source, setSource] = useState<"file" | "server">("file");
  const [content, setContent] = useState("");
  const [fromServer, setFromServer] = useState("");
  const [mode, setMode] = useState<ImportMode>("append");
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportZoneResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setResult(null);
    try {
      const response = await importZone(zone.name, {
        ...(source === "file"
          ? { content }
          : { from_server: fromServer.trim() }),
        mode,
        dry_run: dryRun,
      });
      setResult(response);
      if (response.applied) {
        onApplied();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to import zone"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Import into <span className="font-bold">{zone.name}</span>
      </h2>

      <div className="space-y-4">
        <div className="flex gap-4 text-sm text-gray-600">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="source"
              checked={source === "file"}
              onChange={() => setSource("file")}
            />
            <span>Zone file</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="source"
              checked={source === "server"}
              onChange={() => setSource("server")}
            />
            <span>From a server (AXFR)</span>
          </label>
        </div>
        {source === "file" ? (
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              BIND Zone File
            </label>
            <textarea
              id="content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              placeholder={"www IN A 192.0.2.1\nmail IN A 192.0.2.2"}
              className="w-full font-mono text-sm"
            />
          </div>
        ) : (
          <div>
            <label
              htmlFor="from_server"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Server
            </label>
            <input
              type="text"
              id="from_server"
              name="from_server"
              value={fromServer}
              onChange={(e) => setFromServer(e.target.value)}
              required
              placeholder="192.0.2.1:53"
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              The zone is transferred over AXFR; the server must allow it.
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="mode"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Mode
          </label>
          <select
            id="mode"
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as ImportMode)}
            className="w-full"
          >
            {IMPORT_MODES.map((importMode) => (
              <option key={importMode} value={importMode}>
                {importMode}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {MODE_DESCRIPTIONS[mode]}
          </p>
        </div>
        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          <span>Dry run (validate without applying changes)</span>
        </label>
      </div>

      {result && (
        <Notice
          tone={
            result.errors.length > 0
              ? "error"
              : result.applied
                ? "success"
                : "info"
          }
        >
          <p className="font-medium mb-1">
            {result.errors.length > 0
              ? "Validation failed, nothing was applied"
              : result.applied
                ? "Import applied"
                : "Dry run result (no changes applied)"}
          </p>
          <p>
            Parsed {result.summary.parsed}, added {result.summary.added},
            updated {result.summary.updated}, deleted {result.summary.deleted},
            unchanged {result.summary.unchanged}, skipped{" "}
            {result.summary.skipped}
          </p>
          {result.errors.length > 0 && (
            <ul className="list-disc list-inside mt-2 space-y-1">
              {result.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Importing..." : dryRun ? "Validate" : "Import"}
        </button>
      </div>
    </form>
  );
}
