import { useCallback, useEffect, useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getDnssecStatus } from "@/lib/api";
import { Action, Zone } from "@/lib/types";
import TabBar from "./TabBar";
import ZoneDnssecTab from "./ZoneDnssecTab";
import ZoneForm from "./ZoneForm";
import ZoneSyncTab from "./ZoneSyncTab";
import ZoneVersions from "./ZoneVersions";

interface ZoneDetailsProps {
  zone: Zone;
  onZoneChanged: (zone: Zone) => void;
  onDnssecChanged?: (zoneName: string, enabled: boolean) => void;
}

const TABS = [
  { id: "zone", label: "Zone" },
  { id: "history", label: "History" },
  { id: "dnssec", label: "DNSSEC" },
  { id: "sync", label: "Sync" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** The action a tab's reads need in the zone; the Zone tab needs none beyond seeing it. */
const TAB_ACTIONS: Partial<Record<TabId, Action>> = {
  history: "zone:read",
  dnssec: "dnssec:read",
  sync: "zone:read",
};

export default function ZoneDetails({
  zone,
  onZoneChanged,
  onDnssecChanged,
}: ZoneDetailsProps) {
  const { allows } = useBindizrToken();
  const [activeTab, setActiveTab] = useState<TabId>("zone");
  const [isEditing, setIsEditing] = useState(false);
  const [dnssecEnabled, setDnssecEnabled] = useState(false);
  const canReadDnssec = allows("dnssec:read", zone.name);
  const tabs = TABS.filter((tab) => {
    const action = TAB_ACTIONS[tab.id];
    return !action || allows(action, zone.name);
  });

  // Stable identity: the DNSSEC tab keys an effect on this callback.
  const updateDnssecEnabled = useCallback(
    (enabled: boolean) => {
      setDnssecEnabled(enabled);
      onDnssecChanged?.(zone.name, enabled);
    },
    [onDnssecChanged, zone.name],
  );

  useEffect(() => {
    let active = true;

    setDnssecEnabled(false);
    if (!canReadDnssec) {
      return;
    }
    getDnssecStatus(zone.name)
      .then((status) => {
        if (active) {
          setDnssecEnabled(status.enabled);
        }
      })
      // The badge is decorative; the DNSSEC tab surfaces errors.
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [zone.name, canReadDnssec]);

  const handleTabChange = (tab: TabId) => {
    setIsEditing(false);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-800 break-all">
          {zone.name}
        </h2>
        {dnssecEnabled && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            DNSSEC
          </span>
        )}
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={handleTabChange} />

      <div className="max-h-[65vh] overflow-y-auto scrollbar-visible">
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
            <div className="space-y-2">
              {!zone.enabled && (
                <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200">
                  <p className="text-sm font-medium text-amber-800">Disabled</p>
                  <p className="text-sm text-amber-700">
                    The secondaries have dropped this zone. Its records stay
                    here, editable.
                  </p>
                </div>
              )}
              {zone.description && (
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-base text-gray-900 break-all">
                    {zone.description}
                  </p>
                </div>
              )}
              <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Admin Email</p>
                <p className="text-base text-gray-900 break-all">
                  {zone.rname}
                </p>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Primary NS</p>
                <p className="text-base text-gray-900 break-all">
                  {zone.mname}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Default TTL</p>
                  <p className="text-base text-gray-900">{zone.default_ttl}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Serial</p>
                  <p className="text-base text-gray-900">{zone.serial}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Refresh</p>
                  <p className="text-base text-gray-900">{zone.refresh}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Retry</p>
                  <p className="text-base text-gray-900">{zone.retry}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Expire</p>
                  <p className="text-base text-gray-900">{zone.expire}</p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Minimum TTL</p>
                  <p className="text-base text-gray-900">{zone.minimum_ttl}</p>
                </div>
              </div>
            </div>
            {allows("zone:update", zone.name) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn-primary"
                >
                  Edit Zone
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <ZoneVersions
            zone={zone}
            // A rollback advances the serial, dropping the zone out of a filter.
            onRolledBack={(result) =>
              onZoneChanged({ ...zone, serial: result.new_serial })
            }
          />
        )}

        {activeTab === "dnssec" && (
          <ZoneDnssecTab
            zone={zone}
            onEnabledChanged={updateDnssecEnabled}
            canManage={allows("dnssec:manage", zone.name)}
          />
        )}

        {activeTab === "sync" && (
          <ZoneSyncTab zone={zone} onZoneChanged={onZoneChanged} />
        )}
      </div>
    </div>
  );
}
