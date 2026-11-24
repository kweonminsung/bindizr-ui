import AccessLogList from "@/components/AccessLogList";
import { PageHeader } from "@/components/PageHeader";

export default function AccessLogPage() {
  return (
    <div>
      <PageHeader
        title="Access Log"
        description="API requests and DNS updates by actor, client address and result. Requests from this UI use the UI server's address."
      />
      <AccessLogList />
    </div>
  );
}
