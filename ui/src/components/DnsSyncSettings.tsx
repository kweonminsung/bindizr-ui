import { useState, useCallback, useEffect } from "react";

interface CronLog {
  id: number;
  timestamp: string;
  message: string;
}

const MIN_INTERVAL_SEC = 600;

export default function DnsSyncSettings() {
  const [cronEnabled, setCronEnabled] = useState(false);
  const [cronInterval, setCronInterval] = useState(300);
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchSettings = useCallback(async (pageNum = 1) => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/cron?page=${pageNum}&limit=20`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setCronEnabled(data.settings.enabled === 1);
          setCronInterval(data.settings.interval);
          setLogs(data.logs);
        } else {
          setLogs((prevLogs) => [...prevLogs, ...data.logs]);
        }
        setHasMore(data.logs.length > 0 && data.totalLogs > pageNum * 20);
      }
    } catch (error) {
      console.error("Failed to fetch cron settings", error);
    }
  }, []);

  useEffect(() => {
    fetchSettings(1);
  }, [fetchSettings]);

  const handleToggleCron = useCallback(async () => {
    if (cronInterval < MIN_INTERVAL_SEC) {
      alert(`Interval must be at least ${MIN_INTERVAL_SEC} seconds`);
      return;
    }
    setLoading(true);
    const newCronEnabled = !cronEnabled;
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/cron", {
        method: "POST",
        headers,
        body: JSON.stringify({
          enabled: newCronEnabled,
          interval: cronInterval,
        }),
      });
      if (response.ok) {
        setCronEnabled(newCronEnabled);
        fetchSettings(); // Refresh logs
      } else {
        alert("Failed to update settings");
      }
    } catch (error) {
      alert("An error occurred while updating settings");
    }
    setLoading(false);
  }, [cronEnabled, cronInterval, fetchSettings]);

  return (
    <div className="pt-6">
      <h2 className="text-2xl font-bold text-(--primary) mb-4">
        DNS Sync Cron
      </h2>
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
          <div>
            <label
              htmlFor="cron-interval"
              className="text-(--primary) mr-2 font-medium"
            >
              Interval(s):
            </label>
            <input
              id="cron-interval"
              type="number"
              min={MIN_INTERVAL_SEC}
              value={cronInterval}
              onChange={(e) => setCronInterval(Number(e.target.value))}
              disabled={cronEnabled}
              className="w-48 rounded"
            />
          </div>

          <button
            onClick={handleToggleCron}
            disabled={loading}
            className={`btn ${cronEnabled ? "btn-danger" : "btn-primary"}`}
          >
            {loading
              ? "Saving..."
              : cronEnabled
              ? "Disable Cron Job"
              : "Enable Cron Job"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-md p-4">
        <div
          className="h-64 overflow-y-auto"
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (
              scrollHeight - scrollTop === clientHeight &&
              hasMore &&
              !loading
            ) {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchSettings(nextPage);
            }
          }}
        >
          {logs.map((log) => (
            <div key={log.id} className="text-sm text-gray-400 mb-2">
              <span className="font-mono mr-2">
                [{new Date(log.timestamp).toLocaleString()}]
              </span>
              <span>{log.message}</span>
            </div>
          ))}
          {loading && <div className="text-center">Loading...</div>}
        </div>
      </div>
    </div>
  );
}
