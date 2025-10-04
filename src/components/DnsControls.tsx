"use client";

import { useState } from "react";
import { reloadDns, getDnsStatus, postDnsConfig } from "@/lib/api";

export default function DnsControls() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      setMsg(await postDnsConfig());
      setMsg(await reloadDns());
      alert("DNS reloaded successfully");
    } catch (error) {
      setMsg("An error occurred while synchronizing DNS");
    }
    setLoading(false);
  };

  const handleStatus = async () => {
    setLoading(true);
    try {
      setMsg(await getDnsStatus());
    } catch (error) {
      setMsg("An error occurred while getting DNS status");
    }
    setLoading(false);
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-(--primary) mb-4">DNS Controls</h2>
      <div className="rounded-md">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSync}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Synchronizing..." : "Sync DNS"}
          </button>
          <button
            onClick={handleStatus}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Getting Status..." : "Get DNS Status"}
          </button>
        </div>
        <div className="mt-6">
          <pre className="p-4 bg-white rounded-md whitespace-pre-wrap">
            {msg ? msg : "Response will appear here..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
