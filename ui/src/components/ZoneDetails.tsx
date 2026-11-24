import { useCallback, useEffect, useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getDnssecStatus } from "@/lib/api";
import { Action, ZoneResponse } from "@/lib/types";
import { ModalContent } from "./Modal";
import TabBar from "./TabBar";
import ZoneDnssecTab from "./ZoneDnssecTab";
import ZoneForm from "./ZoneForm";
import ZoneSyncTab from "./ZoneSyncTab";
import ZoneVersions from "./ZoneVersions";

interface ZoneDetailsProps {
  zone: ZoneResponse;
  /** The tab a link opens on; the zone's own unless it names a visible one. */
  initialTab?: string | null;
  onZoneChanged: (zone: ZoneResponse) => void;
  onSerialChanged: (serial: number) => void;
  onDnssecChanged?: (zoneName: string, enabled: boolean) => void;
}

const TABS = [
  { id: "zone", label: "Zone" },
  { id: "history", label: "History" },
  { id: "dnssec", label: "DNSSEC" },
  { id: "sync", label: "Sync" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** The actions any one of which opens a tab; the Zone tab needs none beyond
 * seeing the zone. Sync shows status to zone:read and NOTIFY to zone:update. */
const TAB_ACTIONS: Partial<Record<TabId, Action[]>> = {
  history: ["zone:read"],
  dnssec: ["dnssec:read"],
  sync: ["zone:read", "zone:update"],
};

export default function ZoneDetails({
  zone,
  initialTab,
  onZoneChanged,
  onSerialChanged,
  onDnssecChanged,
}: ZoneDetailsProps) {
  const { allows } = useBindizrToken();
  const tabs = TABS.filter((tab) => {
    const actions = TAB_ACTIONS[tab.id];
    return !actions || actions.some((action) => allows(action, zone.name));
  });
  const [activeTab, setActiveTab] = useState<TabId>(
    () => tabs.find((tab) => tab.id === initialTab)?.id ?? "zone",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [dnssecEnabled, setDnssecEnabled] = useState(false);
  const canReadDnssec = allows("dnssec:read", zone.name);

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
    <ModalContent
      scrollKey={activeTab}
      header={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
              Zone details
            </h2>
            {dnssecEnabled && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                DNSSEC
              </span>
            )}
          </div>
          <TabBar tabs={tabs} active={activeTab} onChange={handleTabChange} />
        </div>
      }
    >
      <div className="min-w-0 space-y-4">
        <p className="text-sm font-medium text-gray-700 wrap-anywhere">
          {zone.name}
        </p>
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
                    Bindizr removes this zone from its catalog. Its records stay
                    here, editable.
                  </p>
                </div>
              )}
              {zone.description && (
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-base text-gray-900 wrap-anywhere">
                    {zone.description}
                  </p>
                </div>
              )}
              <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Admin Email</p>
                <p className="text-base text-gray-900 wrap-anywhere">
                  {zone.rname}
                </p>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500">Primary NS</p>
                <p className="text-base text-gray-900 wrap-anywhere">
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
            onRolledBack={(result) => onSerialChanged(result.new_serial)}
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
          <ZoneSyncTab zone={zone} onSerialChanged={onSerialChanged} />
        )}
      </div>
    </ModalContent>
  );
}
