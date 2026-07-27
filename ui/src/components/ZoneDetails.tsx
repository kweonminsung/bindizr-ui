import { useState } from "react";
import { Zone } from "@/lib/types";
import ZoneForm from "./ZoneForm";
import ZoneSnapshots from "./ZoneSnapshots";
import ZoneSyncTab from "./ZoneSyncTab";
import ZoneTsigPolicies from "./ZoneTsigPolicies";

interface ZoneDetailsProps {
  zone: Zone;
  onZoneChanged: (zone: Zone) => void;
}

const TABS = [
  { id: "zone", label: "Zone" },
  { id: "history", label: "History" },
  { id: "nsupdate", label: "nsupdate" },
  { id: "sync", label: "Sync" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ZoneDetails({ zone, onZoneChanged }: ZoneDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("zone");
  const [isEditing, setIsEditing] = useState(false);

  const handleTabChange = (tab: TabId) => {
    setIsEditing(false);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 break-all">
        {zone.name}
      </h2>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-(--primary) text-(--primary)"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[65vh] overflow-y-auto">
        {activeTab === "zone" && isEditing && (
          <ZoneForm
            zone={zone}
            onSuccess={(updatedZone) => {
              setIsEditing(false);
              onZoneChanged(updatedZone);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}

        {activeTab === "zone" && !isEditing && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Admin Email</p>
                <p className="text-lg text-gray-900 break-all">
                  {zone.admin_email}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Primary NS</p>
                <p className="text-lg text-gray-900 break-all">
                  {zone.primary_ns}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">TTL</p>
                  <p className="text-lg text-gray-900">{zone.ttl}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Serial</p>
                  <p className="text-lg text-gray-900">{zone.serial ?? "-"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Refresh</p>
                  <p className="text-lg text-gray-900">{zone.refresh}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
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
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn-primary"
              >
                Edit Zone
              </button>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <ZoneSnapshots
            zone={zone}
            // A rollback advances the serial, which can drop the zone out of the
            // list's active filters, so hand the new serial over directly.
            onRolledBack={(result) =>
              onZoneChanged({ ...zone, serial: result.new_serial })
            }
          />
        )}

        {activeTab === "nsupdate" && <ZoneTsigPolicies zone={zone} />}

        {activeTab === "sync" && <ZoneSyncTab zone={zone} />}
      </div>
    </div>
  );
}
