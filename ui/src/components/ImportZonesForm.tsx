import { useState } from "react";
import { importZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  IMPORT_MODES,
  ImportMode,
  ImportResult,
  ImportZonesItem,
  ImportZonesResult,
} from "@/lib/types";
import Notice from "./Notice";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { useToast } from "@/contexts/ToastContext";

interface ImportZonesFormProps {
  onApplied: () => void;
}

const MODE_DESCRIPTIONS: Record<ImportMode, string> = {
  append: "Only add records that do not exist yet.",
  upsert: "Add new records and update TTLs of existing ones.",
  replace: "Make each zone match the source exactly, deleting extra records.",
};

const RESULT_STYLES: Record<ImportResult, string> = {
  ok: "bg-green-100 text-green-700",
  rejected: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

const HEADER =
  "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider";

/** The zone names a list gives, one per line; blank and `#` lines are skipped. */
const parseZoneNames = (list: string) =>
  list
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

/** What a zone's row says went wrong: the error of one that never ran, or
 * the first validation error of a rejected one. */
function describeFailure(item: ImportZonesItem): string {
  if (item.error) {
    return item.error.error;
  }
  const errors = item.import?.errors ?? [];
  if (errors.length === 0) {
    return "-";
  }
  return errors.length === 1
    ? errors[0]
    : `${errors[0]} (+${errors.length - 1} more)`;
}

export default function ImportZonesForm({ onApplied }: ImportZonesFormProps) {
  const toast = useToast();
  const { allows, allowsWholeZoneAnywhere } = useBindizrToken();
  // Upsert and replace delete what they rewrite, so a zone takes them only
  // from a caller holding record:delete beside record:create on it.
  const modes = allowsWholeZoneAnywhere("record:create", "record:delete")
    ? IMPORT_MODES
    : IMPORT_MODES.filter((importMode) => importMode === "append");
  const [fromServer, setFromServer] = useState("");
  const [source, setSource] = useState<"list" | "catalog">("list");
  const [zoneList, setZoneList] = useState("");
  const [catalog, setCatalog] = useState("");
  const [mode, setMode] = useState<ImportMode>("append");
  const [dryRun, setDryRun] = useState(false);
  const [skipUnsupported, setSkipUnsupported] = useState(false);
  const [create, setCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportZonesResult | null>(null);

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
        skip_unsupported: skipUnsupported,
        create,
      });
      setResult(response);
      if (!response.dry_run && response.summary.ok > 0) {
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
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
        <div className="flex gap-4 text-sm text-gray-600">
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
              onChange={() => setSource("catalog")}
            />
            <span>Catalog zone (RFC 9432)</span>
          </label>
        </div>
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
        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={skipUnsupported}
            onChange={(e) => setSkipUnsupported(e.target.checked)}
          />
          <span>Skip record types Bindizr does not store</span>
        </label>
        {allows("zone:create") && (
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={create}
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
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th scope="col" className={HEADER}>
                    Zone
                  </th>
                  <th scope="col" className={HEADER}>
                    Result
                  </th>
                  <th scope="col" className={HEADER}>
                    Added
                  </th>
                  <th scope="col" className={HEADER}>
                    Updated
                  </th>
                  <th scope="col" className={HEADER}>
                    Deleted
                  </th>
                  <th scope="col" className={HEADER}>
                    Unchanged
                  </th>
                  <th scope="col" className={HEADER}>
                    Skipped
                  </th>
                  <th scope="col" className={HEADER}>
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {result.zones.map((item) => {
                  const summary = item.import?.summary;
                  const count = (value?: number) => value ?? "-";
                  return (
                    <tr key={item.zone_name}>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                        {item.zone_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_STYLES[item.result]}`}
                        >
                          {item.result}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {count(summary?.added)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {count(summary?.updated)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {count(summary?.deleted)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {count(summary?.unchanged)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {count(summary?.skipped)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {describeFailure(item)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
