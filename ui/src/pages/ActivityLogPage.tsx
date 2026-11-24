import ActivityLogList from "@/components/ActivityLogList";
import { PageHeader } from "@/components/PageHeader";

export default function ActivityLogPage() {
  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Management operations and committed DNS changes."
      />
      <ActivityLogList />
    </div>
  );
}
