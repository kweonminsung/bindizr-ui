import AccessLogList from "@/components/AccessLogList";

export default function AccessLogPage() {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        The API requests and nsupdates Bindizr answered, denied or failed: what
        was asked, from where, under which token or TSIG key. Requests this UI
        makes come from its own address.
      </p>
      <AccessLogList />
    </div>
  );
}
