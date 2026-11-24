import { readResponseError } from "@/lib/errors";
import { useState, useEffect } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { testBindizrConnection } from "@/lib/bindizrTest";
import { getLocalApiHeaders } from "@/lib/localApi";
import ConnectedTokenDetails from "./ConnectedTokenDetails";
import Modal from "./Modal";
import { useToast } from "@/contexts/ToastContext";

export default function BindizrSettings() {
  const toast = useToast();
  const { self, refresh: refreshToken } = useBindizrToken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTokenOpen, setIsTokenOpen] = useState(false);
  const [bindizrUrl, setBindizrUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectionTested, setIsConnectionTested] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/bindizr/settings", {
        headers: getLocalApiHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBindizrUrl(data.bindizrUrl || "");
        setApiToken(data.apiToken || "");
      } else {
        toast.error("Failed to load settings.");
      }
    } catch {
      toast.error("Failed to load settings.");
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = () => {
    fetchSettings();
    setIsConnectionTested(false);
    setIsModalOpen(true);
  };

  const testConnection = async () => {
    const testResult = await testBindizrConnection(bindizrUrl, apiToken);
    toast.show(testResult.ok ? "success" : "error", testResult.message);
    if (testResult.ok) {
      setIsConnectionTested(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnectionTested) {
      toast.error("Please test the connection first.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch("/api/bindizr/settings", {
        method: "POST",
        headers: getLocalApiHeaders(),
        body: JSON.stringify({ bindizrUrl, apiToken }),
      });

      if (res.ok) {
        toast.success("Settings updated successfully.");
        // The API token may grant access to different resources.
        await refreshToken();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1000);
      } else {
        const { message } = await readResponseError(
          res,
          "Failed to update settings.",
        );
        toast.error(message);
      }
    } catch {
      toast.error("An error occurred while updating settings.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
        Bindizr Settings
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">
            Configure the connection to the Bindizr server.
          </p>
          {self && (
            <p className="mt-1 text-sm text-gray-500 wrap-anywhere">
              Connected as{" "}
              <span className="font-medium text-gray-700">{self.name}</span> (
              role {self.role_name}).{" "}
              <button
                type="button"
                onClick={() => setIsTokenOpen(true)}
                className="font-medium text-blue-600 hover:underline"
              >
                Details
              </button>
            </p>
          )}
        </div>
        <button
          onClick={handleOpenModal}
          className="btn-primary w-full shrink-0 sm:w-auto"
        >
          Edit Bindizr Settings
        </button>
      </div>

      {self && isTokenOpen && (
        <Modal isOpen wide onClose={() => setIsTokenOpen(false)}>
          <ConnectedTokenDetails token={self} />
        </Modal>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Edit Bindizr Settings
          </h2>
          <div>
            <label
              htmlFor="bindizrUrl"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Bindizr URL
            </label>
            <input
              type="text"
              id="bindizrUrl"
              value={bindizrUrl}
              onChange={(e) => {
                setBindizrUrl(e.target.value);
                setIsConnectionTested(false);
              }}
              placeholder="http://localhost:3000"
              className="w-full"
              required
            />
          </div>
          <div>
            <label
              htmlFor="apiToken"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              API token (optional)
            </label>
            <input
              type="password"
              id="apiToken"
              value={apiToken}
              onChange={(e) => {
                setApiToken(e.target.value);
                setIsConnectionTested(false);
              }}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty if Bindizr runs without authentication.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={testConnection}
              className="btn-secondary"
            >
              Test Connection
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !isConnectionTested}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
