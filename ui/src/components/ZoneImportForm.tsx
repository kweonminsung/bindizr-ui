"use client";

import { useState } from "react";
import { importZoneFile } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { IMPORT_MODES, ImportMode, ImportZoneResult, Zone } from "@/lib/types";

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
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<ImportMode>("append");
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportZoneResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setResult(null);
    try {
      const response = await importZoneFile(zone.name, {
        content,
        mode,
        dry_run: dryRun,
      });
      setResult(response);
      if (response.applied) {
        onApplied();
      }
    } catch (error) {
      alert(getErrorMessage(error, "Failed to import zone file"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Import Zone File
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            BIND Zone File for <span className="font-bold">{zone.name}</span>
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
        <div
          className={`p-3 rounded-md border text-sm ${
            result.errors.length > 0
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-gray-50 border-gray-200 text-gray-700"
          }`}
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
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Importing..." : dryRun ? "Validate" : "Import"}
        </button>
      </div>
    </form>
  );
}
