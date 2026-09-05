import { useState, useEffect } from "react";
import Modal from "./Modal";
import { useAuth } from "@/contexts/AuthContext";
import { getLocalApiHeaders } from "@/lib/localApi";
import { useNavigate } from "react-router-dom";

interface SettingsResult {
  text: string;
  failed: boolean;
}

const resultBanner = (result: SettingsResult) => (
  <p
    className={`p-3 rounded-md border text-sm ${
      result.failed
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-green-200 bg-green-50 text-green-800"
    }`}
  >
    {result.text}
  </p>
);

export default function AccountSettings() {
  const navigate = useNavigate();

  const { accountEnabled, logout } = useAuth();
  const [isChangeAccountModalOpen, setChangeAccountModalOpen] = useState(false);
  const [isEnableAccountModalOpen, setEnableAccountModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newAccountUsername, setNewAccountUsername] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountConfirmPassword, setNewAccountConfirmPassword] =
    useState("");
  const [isAccountEnabled, setIsAccountEnabled] = useState(accountEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const [changeResult, setChangeResult] = useState<SettingsResult | null>(null);
  const [statusResult, setStatusResult] = useState<SettingsResult | null>(null);

  useEffect(() => {
    const fetchAccountStatus = async () => {
      try {
        const res = await fetch("/api/auth/status", {
          headers: getLocalApiHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setIsAccountEnabled(data.accountEnabled);
        }
      } catch (error) {
        console.error("Failed to fetch account status:", error);
      }
    };

    const fetchUserInfo = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: getLocalApiHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username || "");
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      }
    };

    fetchAccountStatus();
    fetchUserInfo();
  }, []);

  const handleAccountChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setChangeResult({ text: "New passwords do not match.", failed: true });
      return;
    }
    if (!username.trim() && !newPassword) {
      setChangeResult({ text: "No changes were made.", failed: true });
      return;
    }
    setIsLoading(true);
    setChangeResult(null);

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: getLocalApiHeaders(),
        body: JSON.stringify({
          newUsername: username,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      setChangeResult({ text: data.message, failed: !res.ok });
      if (res.ok) {
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setChangeAccountModalOpen(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to update account:", error);
      setChangeResult({
        text: "An error occurred while updating the account.",
        failed: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountStatusChange = async (enable = false) => {
    if (!enable) {
      setIsLoading(true);
      setStatusResult(null);
      try {
        const res = await fetch("/api/account", {
          method: "POST",
          headers: getLocalApiHeaders(),
          body: JSON.stringify({ isEnabled: false }),
        });
        const data = await res.json();
        setStatusResult({ text: data.message, failed: !res.ok });
        if (res.ok) {
          setIsAccountEnabled(false);
        }
      } catch (error) {
        console.error("Failed to disable account:", error);
        setStatusResult({
          text: "An error occurred while disabling the account.",
          failed: true,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setNewAccountUsername("");
      setNewAccountPassword("");
      setNewAccountConfirmPassword("");
      setStatusResult(null);
      setEnableAccountModalOpen(true);
    }
  };

  const handleEnableAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccountPassword !== newAccountConfirmPassword) {
      setStatusResult({ text: "Passwords do not match.", failed: true });
      return;
    }
    setIsLoading(true);
    setStatusResult(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: getLocalApiHeaders(),
        body: JSON.stringify({
          isEnabled: true,
          username: newAccountUsername,
          password: newAccountPassword,
        }),
      });
      const data = await res.json();
      setStatusResult({ text: data.message, failed: !res.ok });
      if (res.ok) {
        setIsAccountEnabled(true);
        setTimeout(() => {
          setEnableAccountModalOpen(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to enable account:", error);
      setStatusResult({
        text: "An error occurred while enabling the account.",
        failed: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleOpenModal = () => {
    setChangeResult(null);
    setNewPassword("");
    setConfirmPassword("");
    setChangeAccountModalOpen(true);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-6">
      <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
        Account Settings
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900">Change Account</h3>
          <p className="text-sm text-gray-500">
            Change your username and password.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="btn-primary w-full sm:w-auto"
        >
          Change Account
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900">Account Status</h3>
          <p className="text-sm text-gray-500">
            The account is currently {isAccountEnabled ? "enabled" : "disabled"}
            .
          </p>
        </div>
        <button
          onClick={() => handleAccountStatusChange(!isAccountEnabled)}
          className={`${
            isAccountEnabled ? "btn-danger" : "btn-primary"
          } w-full sm:w-auto`}
          disabled={isLoading}
        >
          {isLoading
            ? "Updating..."
            : isAccountEnabled
              ? "Disable Account"
              : "Enable Account"}
        </button>
      </div>
      {statusResult && !isEnableAccountModalOpen && resultBanner(statusResult)}

      {isAccountEnabled && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-medium text-gray-900">Logout</h3>
            <p className="text-sm text-gray-500">Log out of your account.</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-primary w-full sm:w-auto"
          >
            Logout
          </button>
        </div>
      )}

      <Modal
        isOpen={isChangeAccountModalOpen}
        onClose={() => setChangeAccountModalOpen(false)}
      >
        <form onSubmit={handleAccountChange} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Change Account
          </h2>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              New Password (optional)
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full"
            />
          </div>

          {changeResult && resultBanner(changeResult)}

          <div className="flex justify-end pt-4">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEnableAccountModalOpen}
        onClose={() => setEnableAccountModalOpen(false)}
      >
        <form onSubmit={handleEnableAccount} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Enable Account
          </h2>
          <div>
            <label
              htmlFor="newAccountUsername"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              New Username
            </label>
            <input
              type="text"
              id="newAccountUsername"
              value={newAccountUsername}
              onChange={(e) => setNewAccountUsername(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div>
            <label
              htmlFor="newAccountPassword"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              New Password
            </label>
            <input
              type="password"
              id="newAccountPassword"
              value={newAccountPassword}
              onChange={(e) => setNewAccountPassword(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div>
            <label
              htmlFor="newAccountConfirmPassword"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="newAccountConfirmPassword"
              value={newAccountConfirmPassword}
              onChange={(e) => setNewAccountConfirmPassword(e.target.value)}
              className="w-full"
              required
            />
          </div>

          {statusResult && resultBanner(statusResult)}

          <div className="flex justify-end pt-4">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Enabling..." : "Enable Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
