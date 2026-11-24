import TransferLogList from "@/components/TransferLogList";
import { PageHeader } from "@/components/PageHeader";

export default function TransferLogPage() {
  return (
    <div>
      <PageHeader
        title="Transfer Log"
        description="Zone transfer attempts by client address, zone and result."
      />
      <TransferLogList />
    </div>
  );
}
