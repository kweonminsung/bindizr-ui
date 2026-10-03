/** Marks what Bindizr ships and keeps: the admin role, the default policy. */
export default function BuiltinBadge({ title }: { title: string }) {
  return (
    <span
      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
      title={title}
    >
      Built-in
    </span>
  );
}
