import { useState } from "react";
import { importZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  IMPORT_MODES,
  IMPORT_MODE_DESCRIPTIONS,
  ImportMode,
  ImportZonesItemResponse,
  ImportZonesResponse,
} from "@/lib/types";
import Badge from "./Badge";
import ImportSummary from "./ImportSummary";
import Notice from "./Notice";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { useToast } from "@/contexts/ToastContext";

interface ImportZonesFormProps {
  onApplied: () => void;
}

const RESULT_TONES = {
  ok: "success",
  rejected: "warning",
  failed: "danger",
} as const;

/** The zone names a list gives, one per line; blank and `#` lines are skipped. */
const parseZoneNames = (list: string) =>
  list
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

/** What a zone's row says went wrong: the error of one that never ran, or
 * the first validation error of a rejected one. */
function describeFailure(item: ImportZonesItemResponse): string | undefined {
  if (item.error) {
    return item.error.error;
  }
  const errors = item.import?.errors ?? [];
  if (errors.length === 0) {
    return undefined;
  }
  return errors.length === 1
    ? errors[0]
    : `${errors[0]} (+${errors.length - 1} more)`;
}

export default function ImportZonesForm({ onApplied }: ImportZonesFormProps) {
  const toast = useToast();
  const { allows, allowsWholeZone, allowsWholeZoneAnywhere } =
    useBindizrToken();
  const [fromServer, setFromServer] = useState("");
  const [source, setSource] = useState<"list" | "catalog">("list");
  const [zoneList, setZoneList] = useState("");
  const [catalog, setCatalog] = useState("");
  const [mode, setMode] = useState<ImportMode>("append");
  const [dryRun, setDryRun] = useState(false);
  const [create, setCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportZonesResponse | null>(null);

  const canImportAllZones =
    allowsWholeZone("record:create") &&
    (mode === "append" || allowsWholeZone("record:delete"));
  const canReplace =
    source === "catalog" || create
      ? allowsWholeZone("record:create") && allowsWholeZone("record:delete")
      : allowsWholeZoneAnywhere("record:create", "record:delete");
  const modes = canReplace
    ? IMPORT_MODES
    : IMPORT_MODES.filter((importMode) => importMode === "append");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setResult(null);
    try {
      const response = await importZones({
        from_server: fromServer.trim(),
        ...(source === "list"
          ? { zone_names: parseZoneNames(zoneList) }
          : { from_catalog: catalog.trim() }),
        mode,
        dry_run: dryRun,
        create,
      });
      setResult(response);
      if (response.zones.some((item) => item.import?.applied)) {
        onApplied();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to import zones"));
    } finally {
      setSubmitting(false);
    }
  };

  const leftBehind = result
    ? result.summary.rejected + result.summary.failed
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
        Import zones from a server
      </h2>

      <div className="space-y-4">
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
            Every zone is transferred over AXFR; the server must allow it.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="source"
              checked={source === "list"}
              onChange={() => setSource("list")}
            />
            <span>Zone list</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="source"
              checked={source === "catalog"}
              disabled={!canImportAllZones}
              onChange={() => setSource("catalog")}
            />
            <span>Catalog zone (RFC 9432)</span>
          </label>
        </div>
        {!canImportAllZones && (
          <p className="text-xs text-gray-500">
            The selected mode needs whole-zone record permissions across all
            zones to import a catalog or create missing zones.
          </p>
        )}
        {source === "list" ? (
          <div>
            <label
              htmlFor="zone_names"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Zones
            </label>
            <textarea
              id="zone_names"
              name="zone_names"
              value={zoneList}
              onChange={(e) => setZoneList(e.target.value)}
              required
              rows={8}
              placeholder={"example.com\nexample.net"}
              className="w-full font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              One zone per line, as the server serves them.
            </p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="from_catalog"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Catalog zone
            </label>
            <input
              type="text"
              id="from_catalog"
              name="from_catalog"
              value={catalog}
              onChange={(e) => setCatalog(e.target.value)}
              required
              placeholder="catalog.example"
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              Every member zone the catalog lists is imported.
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
            {modes.map((importMode) => (
              <option key={importMode} value={importMode}>
                {importMode}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {IMPORT_MODE_DESCRIPTIONS[mode]}
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
        {allows("zone:create") && (
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={create}
              disabled={!canImportAllZones}
              onChange={(e) => setCreate(e.target.checked)}
            />
            <span>Create zones that do not exist yet, from their SOA</span>
          </label>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <Notice
            tone={
              leftBehind > 0 ? "warning" : result.dry_run ? "info" : "success"
            }
          >
            <p className="font-medium">
              {result.summary.ok} of {result.summary.zones} zone
              {result.summary.zones === 1 ? "" : "s"}{" "}
              {result.dry_run ? "validated" : "imported"}
              {leftBehind > 0 &&
                `; ${result.summary.rejected} rejected, ${result.summary.failed} failed`}
            </p>
          </Notice>
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
            {result.zones.map((item) => {
              const error = describeFailure(item);
              return (
                <li key={item.zone_name} className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium text-gray-900 wrap-anywhere">
                      {item.zone_name}
                    </p>
                    <Badge tone={RESULT_TONES[item.result]}>
                      {item.result}
                    </Badge>
                  </div>
                  {item.import && (
                    <div className="text-gray-600">
                      <ImportSummary
                        summary={item.import.summary}
                        preview={result.dry_run}
                      />
                    </div>
                  )}
                  {error && (
                    <p className="text-sm whitespace-pre-wrap wrap-anywhere text-red-700">
                      {error}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting
            ? dryRun
              ? "Preparing preview…"
              : "Importing…"
            : dryRun
              ? "Preview import"
              : "Import"}
        </button>
      </div>
    </form>
  );
}
