import { useSearchParams } from "react-router-dom";
import AccessLogList from "@/components/AccessLogList";
import AuditLogList from "@/components/AuditLogList";
import TabBar from "@/components/TabBar";
import TransferLogList from "@/components/TransferLogList";

const TABS = [
  { id: "audit", label: "Audit" },
  { id: "access", label: "Access" },
  { id: "transfer", label: "Transfer" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DESCRIPTIONS: Record<TabId, string> = {
  audit:
    "Who created, changed or deleted a token, role, grant, TSIG key, secondary or DNSSEC policy, or deleted a zone, and when. A zone's own changes are in its versions.",
  access:
    "The API requests and nsupdates Bindizr answered, denied or failed: what was asked, from where, under which token or TSIG key. Requests this UI makes come from its own address.",
  transfer:
    "The zone transfers Bindizr answered, refused or failed, by client address and zone.",
};

/** The tab the URL names; the audit log unless it says otherwise. */
const tabFromSearchParams = (searchParams: URLSearchParams): TabId => {
  const tab = searchParams.get("tab");
  return TABS.some(({ id }) => id === tab) ? (tab as TabId) : "audit";
};

export default function LogsPage() {
  // The tab lives in the URL, so a secondary can link to its transfers.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromSearchParams(searchParams);

  // Each log has its own page and filters, so a switch starts afresh.
  const handleTabChange = (next: TabId) => {
    setSearchParams(next === "audit" ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{DESCRIPTIONS[tab]}</p>
      <TabBar tabs={TABS} active={tab} onChange={handleTabChange} />
      {tab === "audit" ? (
        <AuditLogList key="audit" />
      ) : tab === "access" ? (
        <AccessLogList key="access" />
      ) : (
        <TransferLogList key="transfer" />
      )}
    </div>
  );
}
