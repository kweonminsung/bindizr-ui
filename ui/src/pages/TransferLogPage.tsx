import TransferLogList from "@/components/TransferLogList";

export default function TransferLogPage() {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        The zone transfers Bindizr answered, refused or failed, by client
        address and zone.
      </p>
      <TransferLogList />
    </div>
  );
}
