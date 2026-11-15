import AuditLogList from "@/components/AuditLogList";

export default function AuditLogPage() {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Who created, changed or deleted a token, role, grant, TSIG key,
        secondary or DNSSEC policy, or deleted a zone, and when. A zone&apos;s
        own changes are in its versions.
      </p>
      <AuditLogList />
    </div>
  );
}
