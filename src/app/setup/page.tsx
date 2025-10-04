"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [bindizrUrl, setBindizrUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isConnectionTested, setIsConnectionTested] = useState(false);
  const router = useRouter();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (createAccount && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (
      !bindizrUrl.startsWith("http://") &&
      !bindizrUrl.startsWith("https://")
    ) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    const res = await fetch("/api/public/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bindizrUrl,
        secretKey,
        username: createAccount ? username : undefined,
        password: createAccount ? password : undefined,
      }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.message || "An error occurred during setup.");
    }
  };

  const testConnection = async () => {
    setError("");
    setSuccessMessage("");
    if (
      !bindizrUrl.startsWith("http://") &&
      !bindizrUrl.startsWith("https://")
    ) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    try {
      const res = await fetch("/api/public/bindizr/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bindizrUrl, secretKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Connection successful!");
        setIsConnectionTested(true);
      } else {
        setError(data.message || "Connection failed.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
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
              Bindizr Server URL
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
              className="w-full px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="secretKey"
              className="block text-sm font-medium text-gray-700"
            >
              Secret Key (Optional)
            </label>
            <input
              id="secretKey"
              type="password"
              value={secretKey}
              onChange={(e) => {
                setSecretKey(e.target.value);
                setIsConnectionTested(false);
              }}
              className="w-full px-3 py-2 mt-1"
            />
          </div>
          <button
            type="button"
            onClick={testConnection}
            className="w-full px-4 py-2 font-medium btn-primary"
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
              Create Admin Account
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
                  className="w-full px-3 py-2 mt-1"
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
                  className="w-full px-3 py-2 mt-1"
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
                  className="w-full px-3 py-2 mt-1"
                />
              </div>
            </>
          )}
          {error && <p className="text-center text-red-600">{error}</p>}
          {successMessage && (
            <p className="text-center text-green-600">{successMessage}</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 font-medium btn-primary"
            disabled={!isConnectionTested}
          >
            Save Configuration
          </button>
        </form>
      </div>
    </div>
  );
}
