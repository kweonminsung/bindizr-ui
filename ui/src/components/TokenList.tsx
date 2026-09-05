import { useEffect, useState } from "react";
import { deleteToken, getTokens } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
import { ApiToken } from "@/lib/types";
import Modal from "./Modal";
import TokenDetails, { isTokenExpired } from "./TokenDetails";

interface TokenListProps {
  onCreateToken: () => void;
}

export default function TokenList({ onCreateToken }: TokenListProps) {
  const { focusName, clearFocusName } = useFocusName();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchTokens() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTokens();
        if (active) {
          setTokens(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch API tokens"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchTokens();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!focusName) {
      return;
    }
    const match = tokens.find((token) => token.name === focusName);
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
        `Delete "${token.name}"? Its grants go with it, and clients using it stop working.`,
      )
    ) {
      return;
    }

    try {
      await deleteToken(token.name);
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      alert(getErrorMessage(deleteError, "Failed to delete API token"));
    }
  };

  if (loading && tokens.length === 0) {
    return <p className="text-center text-gray-500">Loading API tokens...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleTokens = query
    ? tokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.description?.toLowerCase().includes(query),
      )
    : tokens;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search API tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto mb-4 sm:mb-0"
        />
        <button
          onClick={onCreateToken}
          className="btn-primary w-full sm:w-auto"
        >
          Create API Token
        </button>
      </div>
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
              <th
                scope="col"
                className="w-28 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Scope
              </th>
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
                <td className="whitespace-nowrap px-6 py-4">
                  {token.global ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                      Global
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      Scoped
                    </span>
                  )}
                </td>
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
          {visibleTokens.length > 0
            ? `${visibleTokens.length} API token${visibleTokens.length > 1 ? "s" : ""}`
            : "No API tokens found"}
        </p>
      </div>
    </div>
  );
}
