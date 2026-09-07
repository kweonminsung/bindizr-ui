import { useState, useEffect } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { testBindizrConnection } from "@/lib/bindizrTest";
import { getLocalApiHeaders } from "@/lib/localApi";
import ConnectedTokenDetails from "./ConnectedTokenDetails";
import Modal from "./Modal";
import Notice from "./Notice";

interface SettingsResult {
  text: string;
  failed: boolean;
}

export default function BindizrSettings() {
  const { self, refresh: refreshToken } = useBindizrToken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTokenOpen, setIsTokenOpen] = useState(false);
  const [bindizrUrl, setBindizrUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectionTested, setIsConnectionTested] = useState(false);
  const [result, setResult] = useState<SettingsResult | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/bindizr/settings", {
        headers: getLocalApiHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBindizrUrl(data.bindizrUrl || "");
        setSecretKey(data.secretKey || "");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setResult({ text: "Failed to load settings.", failed: true });
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = () => {
    fetchSettings();
    setResult(null);
    setIsConnectionTested(false);
    setIsModalOpen(true);
  };

  const testConnection = async () => {
    setResult(null);
    const testResult = await testBindizrConnection(bindizrUrl, secretKey);
    setResult({ text: testResult.message, failed: !testResult.ok });
    if (testResult.ok) {
      setIsConnectionTested(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (!isConnectionTested) {
      setResult({ text: "Please test the connection first.", failed: true });
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch("/api/bindizr/settings", {
        method: "POST",
        headers: getLocalApiHeaders(),
        body: JSON.stringify({ bindizrUrl, secretKey }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ text: "Settings updated successfully.", failed: false });
        // The new secret may have another scope.
        await refreshToken();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1000);
      } else {
        setResult({
          text: data.message || "Failed to update settings.",
          failed: true,
        });
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
      setResult({
        text: "An error occurred while updating settings.",
        failed: true,
      });
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
        <div>
          <p className="text-sm text-gray-500">
            Configure the connection to the Bindizr server.
          </p>
          {self && (
            <p className="text-sm text-gray-500 mt-1">
              Connected as{" "}
              <span className="font-medium text-gray-700">{self.name}</span> (
              {self.global ? "Global" : "Scoped"} Token).{" "}
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
          className="btn-primary w-full sm:w-auto"
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
              htmlFor="secretKey"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              API Token (optional)
            </label>
            <input
              type="password"
              id="secretKey"
              value={secretKey}
              onChange={(e) => {
                setSecretKey(e.target.value);
                setIsConnectionTested(false);
              }}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty if Bindizr runs without authentication.
            </p>
          </div>

          {result && (
            <Notice tone={result.failed ? "error" : "success"}>
              {result.text}
            </Notice>
          )}

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
