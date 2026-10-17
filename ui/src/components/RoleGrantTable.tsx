import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/datetime";
import { RoleGrant } from "@/lib/types";

interface RoleGrantTableProps {
  grants: RoleGrant[];
  /** Offer a revoke per row; omitted for a read-only view. */
  onRevoke?: (grant: RoleGrant) => void;
}

const HEADER =
  "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider";

/** A role's grants: the zone each reaches, its actions, and the record constraints. */
export default function RoleGrantTable({
  grants,
  onRevoke,
}: RoleGrantTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th scope="col" className={HEADER}>
              Zone
            </th>
            <th scope="col" className={`${HEADER} w-2/5`}>
              Actions
            </th>
            <th scope="col" className={HEADER}>
              Pattern
            </th>
            <th scope="col" className={HEADER}>
              Types
            </th>
            <th scope="col" className={`hidden sm:table-cell ${HEADER}`}>
              Granted
            </th>
            {onRevoke && <th scope="col" className="px-6 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {grants.map((grant) => (
            <tr key={grant.id}>
              <td className="px-6 py-4 break-all">
                {grant.zone_name === null ? (
                  <span className="font-medium text-gray-900">All zones</span>
                ) : (
                  <Link
                    to={`/records?zoneName=${encodeURIComponent(grant.zone_name)}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {grant.zone_name}
                  </Link>
                )}
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-600 break-words">
                {grant.actions.join(", ")}
              </td>
              <td className="whitespace-nowrap px-6 py-4 font-mono text-gray-600">
                {grant.record_name_pattern}
              </td>
              <td className="whitespace-nowrap px-6 py-4 font-mono text-gray-600">
                {grant.record_types}
              </td>
              <td className="hidden sm:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                {formatDateTime(grant.created_at)}
              </td>
              {onRevoke && (
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onRevoke(grant)}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Revoke
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
