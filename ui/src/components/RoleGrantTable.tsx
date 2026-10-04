import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/datetime";
import { RoleGrant } from "@/lib/types";

interface RoleGrantTableProps {
  grants: RoleGrant[];
  /** Offer a revoke per row; omitted for a read-only view. */
  onRevoke?: (grant: RoleGrant) => void;
}

const HEADER =
  "px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider";

/** A role's grants: the zone each reaches, its actions, and the record constraints. */
export default function RoleGrantTable({
  grants,
  onRevoke,
}: RoleGrantTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className={HEADER}>Zone</th>
            <th className={`${HEADER} w-2/5`}>Actions</th>
            <th className={HEADER}>Pattern</th>
            <th className={HEADER}>Types</th>
            <th className={`hidden sm:table-cell ${HEADER}`}>Granted</th>
            {onRevoke && <th className="w-20 px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {grants.map((grant) => (
            <tr key={grant.id}>
              <td className="truncate px-3 py-2" title={grant.zone_name ?? ""}>
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
              <td className="px-3 py-2 font-mono text-xs text-gray-600 break-words">
                {grant.actions.join(", ")}
              </td>
              <td
                className="truncate px-3 py-2 font-mono text-gray-600"
                title={grant.record_name_pattern}
              >
                {grant.record_name_pattern}
              </td>
              <td
                className="truncate px-3 py-2 font-mono text-gray-600"
                title={grant.record_types}
              >
                {grant.record_types}
              </td>
              <td className="hidden sm:table-cell truncate px-3 py-2 text-gray-500">
                {formatDateTime(grant.created_at)}
              </td>
              {onRevoke && (
                <td className="px-3 py-2 text-right">
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
