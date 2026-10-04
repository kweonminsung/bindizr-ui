import { useEffect, useState } from "react";
import { deleteToken, getTokens } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
import { ApiToken } from "@/lib/types";
import Modal from "./Modal";
import Notice from "./Notice";
import TokenDetails, { isTokenExpired } from "./TokenDetails";
import { useToast } from "@/contexts/ToastContext";
import RoleFilterSelect from "./RoleFilterSelect";

interface TokenListProps {
  onCreateToken: () => void;
  /** Lists only this role's; its column is then left out. */
  roleName?: string;
  /** Shows a role filter that reports the pick here. */
  onRoleNameChange?: (roleName: string) => void;
  /** Called after a delete, for a parent showing counts. */
  onChange?: () => void;
}

export default function TokenList({
  onCreateToken,
  roleName,
  onRoleNameChange,
  onChange,
}: TokenListProps) {
  const toast = useToast();
  const { focusName, clearFocusName } = useFocusName();
  const [listing, setListing] = useState<{
    roleFilter: string;
    tokens: ApiToken[];
  } | null>(null);
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  // Rows fetched under another role filter are never drawn under this one.
  const roleFilter = roleName ?? "";
  const tokens = listing?.roleFilter === roleFilter ? listing.tokens : null;

  useEffect(() => {
    let active = true;

    async function fetchTokens() {
      setError(null);
      try {
        const data = await getTokens(roleFilter);
        if (active) {
          setListing({ roleFilter, tokens: data });
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch API tokens"));
        }
      }
    }

    fetchTokens();

    return () => {
      active = false;
    };
  }, [refreshKey, roleFilter]);

  useEffect(() => {
    if (!focusName) {
      return;
    }
    const match = tokens?.find((token) => token.name === focusName);
    if (match) {
      setSelectedToken(match);
    }
  }, [tokens, focusName]);

  const handleCloseDetails = () => {
    setSelectedToken(null);
    clearFocusName();
  };

  const handleDelete = async (token: ApiToken) => {
    if (
      !window.confirm(
        `Delete "${token.name}"? Clients using it stop working; its role stays.`,
      )
    ) {
      return;
    }

    try {
      toast.success(await deleteToken(token.name));
      setRefreshKey((prev) => prev + 1);
      onChange?.();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Failed to delete API token"));
    }
  };

  if (listing === null && !error) {
    return <p className="text-center text-gray-500">Loading API tokens...</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleTokens = (tokens ?? []).filter(
    (token) =>
      token.name.toLowerCase().includes(query) ||
      token.description?.toLowerCase().includes(query),
  );

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-0">
          <input
            type="text"
            placeholder="Search API tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-auto"
          />
          {onRoleNameChange && (
            <RoleFilterSelect
              value={roleName ?? ""}
              onChange={onRoleNameChange}
            />
          )}
        </div>
        <button
          onClick={onCreateToken}
          className="btn-primary w-full sm:w-auto"
        >
          Create API Token
        </button>
      </div>
      {/* Not an early return: a rejected role filter must stay correctable. */}
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
        </Notice>
      )}
      <div className="overflow-x-auto">
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              {!roleName && (
                <th
                  scope="col"
                  className="w-40 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Role
                </th>
              )}
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Description
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Expires
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Last Used
              </th>
              <th
                scope="col"
                className="w-24 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleTokens.map((token) => (
              <tr
                key={token.id}
                {...clickableRowProps(() => setSelectedToken(token))}
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  {token.name}
                  {isTokenExpired(token) && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Expired
                    </span>
                  )}
                </td>
                {!roleName && (
                  <td className="truncate px-6 py-4 text-gray-700">
                    {token.role_name}
                  </td>
                )}
                <td
                  className="hidden md:table-cell truncate px-6 py-4 text-gray-500"
                  title={token.description ?? undefined}
                >
                  {token.description || "-"}
                </td>
                <td className="hidden lg:table-cell truncate px-6 py-4 text-gray-500">
                  {token.expires_at
                    ? formatDateTime(token.expires_at)
                    : "Never"}
                </td>
                <td className="hidden lg:table-cell truncate px-6 py-4 text-gray-500">
                  {token.last_used_at
                    ? formatDateTime(token.last_used_at)
                    : "Never"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(token);
                    }}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedToken && (
        <Modal isOpen wide onClose={handleCloseDetails}>
          <TokenDetails token={selectedToken} />
        </Modal>
      )}
      <div className="p-4">
        <p className="text-sm text-gray-700">
          {tokens === null
            ? !error && "Loading API tokens..."
            : visibleTokens.length > 0
              ? `${visibleTokens.length} API token${visibleTokens.length > 1 ? "s" : ""}`
              : roleName
                ? "No API tokens in this role"
                : "No API tokens found"}
        </p>
      </div>
    </div>
  );
}
