'use client';

import { useState, useCallback } from 'react';

export default function DnsSyncSettings() {
  const [cronEnabled, setCronEnabled] = useState(false);
  const [cronInterval, setCronInterval] = useState(300); // Default to 5 minutes
  const [loading, setLoading] = useState(false);

  const handleSaveSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: cronEnabled,
          interval: cronInterval,
        }),
      });
      if (response.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      alert('An error occurred while saving settings');
    }
    setLoading(false);
  }, [cronEnabled, cronInterval]);

  return (
    <div className="pt-6">
      <h2 className="text-2xl font-bold text-(--primary) mb-4">
        DNS Sync Cron
      </h2>
      <div className="bg-background-light rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCronEnabled(!cronEnabled)}
              className={`btn ${cronEnabled ? 'btn-danger' : 'btn-primary'}`}
            >
              {cronEnabled ? 'Disable Cron' : 'Enable Cron'}
            </button>
            <div>
              <label htmlFor="cron-interval" className="text-(--primary) mr-2">
                Interval (seconds):
              </label>
              <input
                id="cron-interval"
                type="number"
                value={cronInterval}
                onChange={e => setCronInterval(Number(e.target.value))}
                className="p-2 rounded bg-background-dark text-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="btn-primary disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
