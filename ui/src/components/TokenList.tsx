import { useEffect, useState } from "react";
import { deleteToken, getTokens } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
import { ApiTokenResponse } from "@/lib/types";
import Modal from "./Modal";
import Notice from "./Notice";
import TokenDetails, { isTokenExpired } from "./TokenDetails";
import { useToast } from "@/contexts/ToastContext";
import RoleFilterSelect from "./RoleFilterSelect";
import { SortValue } from "@/lib/sort";
import { useRowSort } from "@/lib/useRowSort";
import {
  describeCount,
  ListCard,
  ListFooter,
  LIST_FIELD_CLASS,
  ListToolbar,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import SortControl from "./SortControl";

interface TokenListProps {
  onCreateToken?: () => void;
  /** Lists only this role's; its column is then left out. */
  roleName?: string;
  /** Shows a role filter that reports the pick here. */
  onRoleNameChange?: (roleName: string) => void;
  /** Called after a delete, for a parent showing counts. */
  onChange?: () => void;
}

const SORT_OPTIONS = [
  { value: "created_at", label: "Created" },
  { value: "name", label: "Name" },
  { value: "role_name", label: "Role" },
  { value: "expires_at", label: "Expires" },
  { value: "last_used_at", label: "Last used" },
] as const;

type TokenSortField = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES: Record<
  TokenSortField,
  (token: ApiTokenResponse) => SortValue
> = {
  created_at: (token) => token.created_at,
  name: (token) => token.name,
  role_name: (token) => token.role_name,
  expires_at: (token) => token.expires_at,
  last_used_at: (token) => token.last_used_at,
};

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
    tokens: ApiTokenResponse[];
  } | null>(null);
  const [selectedToken, setSelectedToken] = useState<ApiTokenResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Newest first, as the server lists them.
  const rowSort = useRowSort(SORT_VALUES, "created_at", "desc");
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

  const handleDelete = async (token: ApiTokenResponse) => {
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

  const query = searchQuery.trim().toLowerCase();
  const visibleTokens = rowSort.sorted(
    (tokens ?? []).filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.description?.toLowerCase().includes(query),
    ),
  );

  return (
    <ListCard>
      <ListToolbar
        sort={
          <SortControl
            options={SORT_OPTIONS}
            sort={rowSort.sort}
            order={rowSort.order}
            onChange={rowSort.onChange}
          />
        }
        scope={
          onRoleNameChange && (
            <RoleFilterSelect
              value={roleName ?? ""}
              onChange={onRoleNameChange}
            />
          )
        }
        actions={
          onCreateToken && (
            <button
              type="button"
              onClick={onCreateToken}
              className="btn-primary"
            >
              Create API Token
            </button>
          )
        }
      >
        <input
          type="text"
          aria-label="Search API tokens"
          placeholder="Search API tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={LIST_FIELD_CLASS}
        />
      </ListToolbar>
      {/* Not an early return: a rejected role filter must stay correctable. */}
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
        </Notice>
      )}
      <div className={`overflow-x-auto ${error ? "opacity-60" : ""}`}>
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Name
              </th>
              {!roleName && (
                <th
                  scope="col"
                  className={`hidden w-40 @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                >
                  Role
                </th>
              )}
              <th
                scope="col"
                className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Description
              </th>
              <th
                scope="col"
                className={`hidden @min-[60rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Expires
              </th>
              <th
                scope="col"
                className={`hidden @min-[60rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Last Used
              </th>
              <th
                scope="col"
                className={`w-20 @min-[50rem]/list:w-24 text-right ${TABLE_HEADER_CLASS}`}
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
                <td className={`${TABLE_CELL_CLASS} font-medium text-gray-900`}>
                  <div className="truncate" title={token.name}>
                    {token.name}
                  </div>
                  {isTokenExpired(token) && (
                    <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Expired
                    </span>
                  )}
                  {!roleName && (
                    <p
                      className="mt-1 truncate text-xs font-normal text-gray-600 @min-[37rem]/list:hidden"
                      title={token.role_name}
                    >
                      {token.role_name}
                    </p>
                  )}
                </td>
                {!roleName && (
                  <td
                    className={`hidden @min-[37rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-700`}
                    title={token.role_name}
                  >
                    {token.role_name}
                  </td>
                )}
                <td
                  className={`hidden @min-[46rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                  title={token.description ?? undefined}
                >
                  {token.description || "-"}
                </td>
                <td
                  className={`hidden @min-[60rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {token.expires_at
                    ? formatDateTime(token.expires_at)
                    : "Never"}
                </td>
                <td
                  className={`hidden @min-[60rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {token.last_used_at
                    ? formatDateTime(token.last_used_at)
                    : "Never"}
                </td>
                <td
                  className={`whitespace-nowrap ${TABLE_CELL_CLASS} text-right`}
                >
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
      <ListFooter
        summary={
          tokens === null
            ? !error && "Loading API tokens..."
            : visibleTokens.length === 0 && roleName
              ? "No API tokens in this role"
              : describeCount(visibleTokens.length, "API token", "API tokens")
        }
      />
    </ListCard>
  );
}
