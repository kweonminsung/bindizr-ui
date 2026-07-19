"use client";

import { useEffect, useState } from "react";
import { createZone, importZoneFile, updateZone } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toOptionalNumber, toRequiredNumber } from "@/lib/form";
import { Zone, ZonePayload } from "@/lib/types";

interface ZoneFormProps {
  zone: Zone | null;
  onSuccess: () => void;
}

interface ZoneFormData {
  name: string;
  primary_ns: string;
  admin_email: string;
  ttl: string;
  serial: string;
  refresh: string;
  retry: string;
  expire: string;
  minimum_ttl: string;
}

const defaultFormData: ZoneFormData = {
  name: "",
  primary_ns: "",
  admin_email: "",
  ttl: "3600",
  serial: "",
  refresh: "7200",
  retry: "3600",
  expire: "604800",
  minimum_ttl: "3600",
};

const toFormString = (value: unknown, fallback: string) =>
  value === null || value === undefined ? fallback : String(value);

export default function ZoneForm({ zone, onSuccess }: ZoneFormProps) {
  const [formData, setFormData] = useState<ZoneFormData>(defaultFormData);
  const [zoneFileContent, setZoneFileContent] = useState("");

  useEffect(() => {
    if (zone) {
      setFormData({
        name: toFormString(zone.name, defaultFormData.name),
        primary_ns: toFormString(zone.primary_ns, defaultFormData.primary_ns),
        admin_email: toFormString(
          zone.admin_email,
          defaultFormData.admin_email,
        ),
        ttl: toFormString(zone.ttl, defaultFormData.ttl),
        serial: toFormString(zone.serial, defaultFormData.serial),
        refresh: toFormString(zone.refresh, defaultFormData.refresh),
        retry: toFormString(zone.retry, defaultFormData.retry),
        expire: toFormString(zone.expire, defaultFormData.expire),
        minimum_ttl: toFormString(
          zone.minimum_ttl,
          defaultFormData.minimum_ttl,
        ),
      });
      return;
    }

    setFormData(defaultFormData);
  }, [zone]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: ZonePayload = {
        name: formData.name,
        primary_ns: formData.primary_ns,
        admin_email: formData.admin_email,
        ttl: toRequiredNumber(formData.ttl, "TTL"),
        serial: toOptionalNumber(formData.serial, "Serial"),
        refresh: toOptionalNumber(formData.refresh, "Refresh"),
        retry: toOptionalNumber(formData.retry, "Retry"),
        expire: toOptionalNumber(formData.expire, "Expire"),
        minimum_ttl: toOptionalNumber(formData.minimum_ttl, "Minimum TTL"),
      };

      if (zone) {
        await updateZone(zone.name, payload);
      } else {
        await createZone(payload);

        const content = zoneFileContent.trim();
        if (content) {
          try {
            const result = await importZoneFile(payload.name, {
              content,
              mode: "append",
            });
            if (result.errors.length > 0) {
              alert(
                `Zone created, but no records were imported:\n${result.errors.join("\n")}`,
              );
            }
          } catch (error) {
            alert(
              `Zone created, but importing the zone file failed: ${getErrorMessage(
                error,
                "unknown error",
              )}`,
            );
          }
        }
      }
      onSuccess();
    } catch (error) {
      alert(getErrorMessage(error, "Failed to save zone"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {zone ? "Edit Zone" : "Create New Zone"}
      </h2>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          General
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="admin_email"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Admin Email
            </label>
            <input
              type="email"
              id="admin_email"
              name="admin_email"
              value={formData.admin_email}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="primary_ns"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Primary NS
            </label>
            <input
              type="text"
              id="primary_ns"
              name="primary_ns"
              value={formData.primary_ns}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Timing
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="ttl"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              TTL
            </label>
            <input
              type="number"
              id="ttl"
              name="ttl"
              value={formData.ttl}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="refresh"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Refresh
            </label>
            <input
              type="number"
              id="refresh"
              name="refresh"
              value={formData.refresh}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="retry"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Retry
            </label>
            <input
              type="number"
              id="retry"
              name="retry"
              value={formData.retry}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="expire"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Expire
            </label>
            <input
              type="number"
              id="expire"
              name="expire"
              value={formData.expire}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="minimum_ttl"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Minimum TTL
            </label>
            <input
              type="number"
              id="minimum_ttl"
              name="minimum_ttl"
              value={formData.minimum_ttl}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="serial"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Serial
            </label>
            <input
              type="number"
              id="serial"
              name="serial"
              value={formData.serial}
              onChange={handleChange}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {!zone && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
            Zone File (optional)
          </h3>
          <div>
            <textarea
              id="zone_file_content"
              name="zone_file_content"
              value={zoneFileContent}
              onChange={(e) => setZoneFileContent(e.target.value)}
              rows={6}
              placeholder={"www IN A 192.0.2.1\nmail IN A 192.0.2.2"}
              className="w-full font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              Paste BIND zone file text to import records into the new zone.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onSuccess} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {zone ? "Update Zone" : "Create Zone"}
        </button>
      </div>
    </form>
  );
}
