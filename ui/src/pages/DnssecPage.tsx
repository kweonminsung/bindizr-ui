import { useSearchParams } from "react-router-dom";
import DnssecOverview from "@/components/DnssecOverview";
import DnssecPoliciesTab from "@/components/DnssecPoliciesTab";
import TabBar from "@/components/TabBar";

const TABS = [
  { id: "zones", label: "Signed Zones" },
  { id: "policies", label: "Policies" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** The tab the URL names; the signed zones unless it says otherwise. */
const tabFromSearchParams = (searchParams: URLSearchParams): TabId =>
  searchParams.get("tab") === "policies" ? "policies" : "zones";

export default function DnssecPage() {
  // The tab lives in the URL, so a link can land on the policies.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromSearchParams(searchParams);

  const handleTabChange = (next: TabId) => {
    setSearchParams(next === "zones" ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {tab === "zones"
          ? "Every signed zone and its signing state. Enable, roll and withdraw from a zone's DNSSEC tab."
          : "Signing parameter sets for zones. Apply a policy from a zone's DNSSEC tab."}
      </p>
      <TabBar tabs={TABS} active={tab} onChange={handleTabChange} />
      {tab === "zones" ? <DnssecOverview /> : <DnssecPoliciesTab />}
    </div>
  );
}
