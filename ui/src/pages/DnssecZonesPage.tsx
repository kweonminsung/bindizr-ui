import DnssecOverview from "@/components/DnssecOverview";
import { PageHeader } from "@/components/PageHeader";

export default function DnssecZonesPage() {
  return (
    <div>
      <PageHeader
        title="Signed Zones"
        description="View signing status and open a zone to manage its keys."
      />
      <DnssecOverview />
    </div>
  );
}
