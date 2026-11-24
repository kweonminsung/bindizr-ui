import AuditLogList from "@/components/AuditLogList";

export default function AuditLogPage() {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        See who changed tokens, roles, grants, TSIG keys, secondaries, DNSSEC
        policies or a zone&apos;s DNSSEC settings, and who deleted zones. Zone
        data edits appear in version history.
      </p>
      <AuditLogList />
    </div>
  );
}
