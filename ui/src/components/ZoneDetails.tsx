import { useState } from "react";
import { Zone } from "@/lib/types";
import { getRenderedZone } from "@/lib/api";

interface ZoneDetailsProps {
  zone: Zone;
}

export default function ZoneDetails({ zone }: ZoneDetailsProps) {
  const [renderedZone, setRenderedZone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShowRenderedZone = async () => {
    if (renderedZone) {
      setRenderedZone(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRenderedZone(zone.id);
      setRenderedZone(data);
    } catch (err) {
      setError("Failed to fetch rendered zone configuration.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Zone Details</h2>

      <div className="space-y-3">
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-lg text-gray-900">{zone.name}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Admin Email</p>
          <p className="text-lg text-gray-900 break-all">{zone.admin_email}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Primary NS</p>
            <p className="text-lg text-gray-900">{zone.primary_ns}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Primary NS IP</p>
            <p className="text-lg text-gray-900">{zone.primary_ns_ip}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">TTL</p>
            <p className="text-lg text-gray-900">{zone.ttl}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Serial</p>
            <p className="text-lg text-gray-900">{zone.serial}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Refresh</p>
            <p className="text-lg text-gray-900">{zone.refresh}</p>
          </div>
          <div className="p-3  bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Retry</p>
            <p className="text-lg text-gray-900">{zone.retry}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Expire</p>
            <p className="text-lg text-gray-900">{zone.expire}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Minimum TTL</p>
            <p className="text-lg text-gray-900">{zone.minimum_ttl}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleShowRenderedZone}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading
            ? "Loading..."
            : renderedZone
            ? "Hide Rendered Zone"
            : "Show Rendered Zone"}
        </button>
      </div>

      {error && <p className="mt-4 text-red-500">{error}</p>}

      {renderedZone && (
        <div className="p-4 bg-gray-100 rounded-md border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-3">
            Rendered Zone Configuration
          </h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
            {renderedZone}
          </pre>
        </div>
      )}
    </div>
  );
}
