import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/datetime";
import { RoleGrantResponse } from "@/lib/types";

interface RoleGrantTableProps {
  grants: RoleGrantResponse[];
  onRevoke?: (grant: RoleGrantResponse) => void;
}

function GrantZone({ name }: { name: string | null }) {
  return name === null ? (
    <span className="font-medium text-gray-900">All zones</span>
  ) : (
    <Link
      to={`/records?zone_name=${encodeURIComponent(name)}`}
      className="font-medium text-blue-600 hover:underline wrap-anywhere"
    >
      {name}
    </Link>
  );
}

function GrantRevoke({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 font-medium text-red-600 hover:underline"
    >
      Revoke
    </button>
  );
}

export default function RoleGrantTable({
  grants,
  onRevoke,
}: RoleGrantTableProps) {
  return (
    <>
      <ul className="space-y-2 @2xl:hidden" aria-label="Role grants">
        {grants.map((grant) => (
          <li
            key={grant.id}
            className="space-y-3 rounded-md border border-gray-200 p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <GrantZone name={grant.zone_name} />
              {onRevoke && <GrantRevoke onClick={() => onRevoke(grant)} />}
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-gray-600">
              <dt>Actions</dt>
              <dd className="font-mono text-xs wrap-anywhere">
                {grant.actions.join(", ")}
              </dd>
              <dt>Pattern</dt>
              <dd className="font-mono wrap-anywhere">
                {grant.record_name_pattern}
              </dd>
              <dt>Types</dt>
              <dd className="font-mono wrap-anywhere">{grant.record_types}</dd>
              <dt>Granted</dt>
              <dd>{formatDateTime(grant.created_at)}</dd>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden rounded-md border border-gray-200 @2xl:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 uppercase [&_th]:px-3 [&_th]:py-2">
            <tr>
              <th scope="col" className="w-1/5">
                Zone
              </th>
              <th scope="col" className="w-1/5">
                Actions
              </th>
              <th scope="col" className="w-1/5">
                Pattern
              </th>
              <th scope="col">Types</th>
              <th scope="col">Granted</th>
              {onRevoke && (
                <th scope="col" className="w-20">
                  <span className="sr-only">Manage</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:wrap-anywhere">
            {grants.map((grant) => (
              <tr key={grant.id}>
                <td>
                  <GrantZone name={grant.zone_name} />
                </td>
                <td className="font-mono text-xs text-gray-600">
                  {grant.actions.join(", ")}
                </td>
                <td className="font-mono text-gray-600">
                  {grant.record_name_pattern}
                </td>
                <td className="font-mono text-gray-600">
                  {grant.record_types}
                </td>
                <td className="text-gray-600">
                  {formatDateTime(grant.created_at)}
                </td>
                {onRevoke && (
                  <td className="text-right">
                    <GrantRevoke onClick={() => onRevoke(grant)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
