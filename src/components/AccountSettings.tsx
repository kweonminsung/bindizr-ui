import { useState, useEffect } from "react";
import Modal from "./Modal";
import LogoutButton from "./LogoutButton";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountSettings() {
  const { accountEnabled } = useAuth();
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
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const fetchAccountStatus = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setIsAccountEnabled(data.accountEnabled);
        }
      } catch (error) {
        console.error("Failed to fetch account status:", error);
      }
    };
    fetchAccountStatus();
    if (session?.user?.name) {
      setUsername(session.user.name);
    }
  }, [session]);

  const handleAccountChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    if (username === session?.user?.name && !newPassword) {
      setMessage("No changes were made.");
      return;
    }
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newUsername: username,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) {
        await update({ name: username });
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setChangeAccountModalOpen(false);
        }, 1000);
      }
    } catch (error) {
      setMessage("An error occurred while updating account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountStatusChange = async (enable = false) => {
    if (!enable) {
      // Disabling account
      setIsLoading(true);
      setStatusMessage("");
      try {
        const res = await fetch("/api/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: false }),
        });
        const data = await res.json();
        setStatusMessage(data.message);
        if (res.ok) {
          setIsAccountEnabled(false);
        }
      } catch (error) {
        setStatusMessage("An error occurred while disabling the account.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Enabling account, open modal
      setNewAccountUsername("");
      setNewAccountPassword("");
      setNewAccountConfirmPassword("");
      setStatusMessage("");
      setEnableAccountModalOpen(true);
    }
  };

  const handleEnableAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccountPassword !== newAccountConfirmPassword) {
      setStatusMessage("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled: true,
          username: newAccountUsername,
          password: newAccountPassword,
        }),
      });
      const data = await res.json();
      setStatusMessage(data.message);
      if (res.ok) {
        setIsAccountEnabled(true);
        setTimeout(() => {
          setEnableAccountModalOpen(false);
        }, 1000);
      }
    } catch (error) {
      setStatusMessage("An error occurred while enabling the account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (session?.user?.name) {
      setUsername(session.user.name);
    }
    setMessage("");
    setNewPassword("");
    setConfirmPassword("");
    setChangeAccountModalOpen(true);
  };

  return (
    <div className="pt-6">
      <h2 className="text-2xl font-bold text-(--primary) mb-4">
        Account Settings
      </h2>
      <div className="rounded-md">
        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-2 text-(--primary)">
            Change Account
          </h3>
          <button onClick={handleOpenModal} className="btn-primary">
            Change Account
          </button>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-2 text-(--primary)">
            Account Status
          </h3>
          <div className="flex items-center">
            <p className="mr-4">
              Account is currently {isAccountEnabled ? "Enabled" : "Disabled"}
            </p>
            <button
              onClick={() => handleAccountStatusChange(!isAccountEnabled)}
              className={`btn ${
                isAccountEnabled ? "btn-danger" : "btn-primary"
              }`}
              disabled={isLoading}
            >
              {isLoading
                ? "Updating..."
                : isAccountEnabled
                ? "Disable Account"
                : "Enable Account"}
            </button>
          </div>
          {statusMessage && (
            <p className="mt-4 text-green-500">{statusMessage}</p>
          )}
        </div>
        {isAccountEnabled && <LogoutButton />}
      </div>

      <Modal
        isOpen={isChangeAccountModalOpen}
        onClose={() => setChangeAccountModalOpen(false)}
      >
        <h3 className="text-xl font-bold mb-4">Change Account</h3>
        <form onSubmit={handleAccountChange}>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-gray-700 font-bold mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="newPassword"
              className="block text-gray-700 font-bold mb-2"
            >
              New Password (Optional)
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-gray-700 font-bold mb-2"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded"
            />
          </div>
          <button
            type="submit"
            className="w-full btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
          {message && <p className="mt-4 text-green-500">{message}</p>}
        </form>
      </Modal>

      <Modal
        isOpen={isEnableAccountModalOpen}
        onClose={() => setEnableAccountModalOpen(false)}
      >
        <h3 className="text-xl font-bold mb-4">Enable Account</h3>
        <form onSubmit={handleEnableAccount}>
          <div className="mb-4">
            <label
              htmlFor="newAccountUsername"
              className="block text-gray-700 font-bold mb-2"
            >
              New Username
            </label>
            <input
              type="text"
              id="newAccountUsername"
              value={newAccountUsername}
              onChange={(e) => setNewAccountUsername(e.target.value)}
              className="w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="newAccountPassword"
              className="block text-gray-700 font-bold mb-2"
            >
              New Password
            </label>
            <input
              type="password"
              id="newAccountPassword"
              value={newAccountPassword}
              onChange={(e) => setNewAccountPassword(e.target.value)}
              className="w-full rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="newAccountConfirmPassword"
              className="block text-gray-700 font-bold mb-2"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="newAccountConfirmPassword"
              value={newAccountConfirmPassword}
              onChange={(e) => setNewAccountConfirmPassword(e.target.value)}
              className="w-full rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Enabling..." : "Enable Account"}
          </button>
          {statusMessage && (
            <p className="mt-4 text-red-500">{statusMessage}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}
