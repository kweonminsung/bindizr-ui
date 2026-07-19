import { useState, useEffect } from "react";
import { testBindizrConnection } from "@/lib/bindizrTest";
import { getLocalApiHeaders } from "@/lib/localApi";
import Modal from "./Modal";

export default function BindizrSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bindizrUrl, setBindizrUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectionTested, setIsConnectionTested] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

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
      setError("Failed to load settings.");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleOpenModal = () => {
    fetchSettings();
    setError("");
    setSuccessMessage("");
    setIsConnectionTested(false);
    setIsModalOpen(true);
  };

  const testConnection = async () => {
    setError("");
    setSuccessMessage("");
    const result = await testBindizrConnection(bindizrUrl, secretKey);
    if (result.ok) {
      setSuccessMessage(result.message);
      setIsConnectionTested(true);
    } else {
      setError(result.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!isConnectionTested) {
      setError("Please test the connection first.");
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
        setSuccessMessage("Settings updated successfully!");
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1000);
      } else {
        setError(data.message || "Failed to update settings.");
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
      setError("An error occurred while updating settings.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-(--primary) mb-4">
        Bindizr Settings
      </h2>
      <div className="rounded-md">
        <div className="flex flex-col">
          <p className="mb-4">
            Configure the connection to your Bindizr server
          </p>
          <button
            onClick={handleOpenModal}
            className="btn-primary w-full sm:w-auto sm:self-start"
          >
            Edit Bindizr Settings
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-xl font-bold mb-4">Edit Bindizr Settings</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="bindizrUrl"
              className="block text-gray-700 font-bold mb-2"
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
              className="w-full rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="secretKey"
              className="block text-gray-700 font-bold mb-2"
            >
              Secret Key (Optional)
            </label>
            <input
              type="password"
              id="secretKey"
              value={secretKey}
              onChange={(e) => {
                setSecretKey(e.target.value);
                setIsConnectionTested(false);
              }}
              className="w-full rounded"
            />
          </div>
          <div className="space-y-4">
            <button
              type="button"
              onClick={testConnection}
              className="w-full btn-primary"
            >
              Test Connection
            </button>
            {error && <p className="text-center text-red-500">{error}</p>}
            {successMessage && (
              <p className="text-center text-green-500">{successMessage}</p>
            )}
            <button
              type="submit"
              className="w-full btn-primary"
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
