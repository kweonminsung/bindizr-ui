'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReload = async () => {
    setLoading(true);
    try {
      // This endpoint is not in the openapi spec, assuming it's a POST to /dns/reload
      const response = await fetch('http://localhost:8000/dns/reload', {
        method: 'POST',
      });
      if (response.ok) {
        alert('DNS reloaded successfully');
      } else {
        alert('Failed to reload DNS');
      }
    } catch (error) {
      alert('An error occurred while reloading DNS');
    }
    setLoading(false);
  };

  const handleStatus = async () => {
    setLoading(true);
    try {
      // This endpoint is not in the openapi spec, assuming it's a GET to /dns/status
      const response = await fetch('http://localhost:8000/dns/status');
      if (response.ok) {
        const data = await response.text();
        setStatus(data);
      } else {
        setStatus('Failed to get DNS status');
      }
    } catch (error) {
      setStatus('An error occurred while getting DNS status');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Settings</h1>
      <div className="space-y-4">
        <button
          onClick={handleReload}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Reloading...' : 'Reload DNS'}
        </button>
        <button
          onClick={handleStatus}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Getting Status...' : 'Get DNS Status'}
        </button>
        {status && (
          <div>
            <h2 className="text-2xl font-bold mt-8">DNS Status</h2>
            <pre className="p-4 bg-gray-900 rounded">{status}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
