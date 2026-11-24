import { readResponseError } from "@/lib/errors";
import { useState } from "react";
import { testBindizrConnection } from "@/lib/bindizrTest";
import { getLocalApiHeaders } from "@/lib/localApi";
import { useToast } from "@/contexts/ToastContext";

export default function SetupPage() {
  const toast = useToast();
  const [bindizrUrl, setBindizrUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [isConnectionTested, setIsConnectionTested] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createAccount && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/public/settings", {
        method: "POST",
        headers: getLocalApiHeaders({ auth: false }),
        body: JSON.stringify({
          bindizrUrl,
          apiToken,
          username: createAccount ? username : undefined,
          password: createAccount ? password : undefined,
        }),
      });

      if (res.ok) {
        window.location.replace("/");
      } else {
        const { message } = await readResponseError(res, "Setup failed.");
        toast.error(message);
      }
    } catch {
      toast.error("Failed to connect to the UI server.");
    }
  };

  const testConnection = async () => {
    const result = await testBindizrConnection(bindizrUrl, apiToken);
    if (result.ok) {
      toast.success(result.message);
      setIsConnectionTested(true);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Initial Setup</h1>
        <form onSubmit={handleSetup} className="space-y-6">
          <div>
            <label
              htmlFor="bindizrUrl"
              className="block text-sm font-medium text-gray-700"
            >
              Bindizr URL
            </label>
            <input
              id="bindizrUrl"
              type="text"
              value={bindizrUrl}
              onChange={(e) => {
                setBindizrUrl(e.target.value);
                setIsConnectionTested(false);
              }}
              required
              className="w-full mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the server’s HTTP or HTTPS base URL. Enter the token below.
            </p>
          </div>
          <div>
            <label
              htmlFor="apiToken"
              className="block text-sm font-medium text-gray-700"
            >
              API token (optional)
            </label>
            <input
              id="apiToken"
              type="password"
              value={apiToken}
              onChange={(e) => {
                setApiToken(e.target.value);
                setIsConnectionTested(false);
              }}
              className="w-full mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty if Bindizr runs without authentication.
            </p>
          </div>
          <button
            type="button"
            onClick={testConnection}
            className="w-full btn-primary"
          >
            Test Connection
          </button>
          <div className="flex items-center">
            <input
              id="createAccount"
              type="checkbox"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label
              htmlFor="createAccount"
              className="block ml-2 text-sm text-gray-900"
            >
              Create UI Admin Account
            </label>
          </div>
          {createAccount && (
            <>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={createAccount}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={createAccount}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={createAccount}
                  className="w-full mt-1"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            className="w-full btn-primary"
            disabled={!isConnectionTested}
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
