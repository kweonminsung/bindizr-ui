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
      <div className="flex items-center space-x-4">
        <button
          onClick={handleReload}
          disabled={loading}
          className="btn-primary disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {loading ? 'Reloading...' : 'Reload DNS'}
        </button>
        <button
          onClick={handleStatus}
          disabled={loading}
          className="btn-primary disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {loading ? 'Getting Status...' : 'Get DNS Status'}
        </button>
      </div>
      {status && (
        <div className="pt-6">
          <h2 className="text-2xl font-bold text-white mb-4">DNS Status</h2>
          <pre className="p-4 bg-background-light rounded-md text-text-secondary whitespace-pre-wrap">
            {status}
          </pre>
        </div>
      )}
    </div>
  );
}
