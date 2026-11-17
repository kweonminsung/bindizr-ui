import DnssecOverview from "@/components/DnssecOverview";

export default function DnssecZonesPage() {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Every signed zone and its signing state. Enable, roll and withdraw from
        a zone&apos;s DNSSEC tab.
      </p>
      <DnssecOverview />
    </div>
  );
}
