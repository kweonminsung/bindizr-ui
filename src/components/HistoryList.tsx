'use client';

import { useState, useEffect } from 'react';
import { getZoneHistories, getRecordHistories } from '../lib/api';
import { ZoneHistory, RecordHistory } from '../lib/types';

interface HistoryListProps {
  resourceId: number;
  resourceType: 'zone' | 'record';
}

const HistoryList: React.FC<HistoryListProps> = ({
  resourceId,
  resourceType,
}) => {
  const [histories, setHistories] = useState<(ZoneHistory | RecordHistory)[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        setLoading(true);
        let newHistories: (ZoneHistory | RecordHistory)[];
        if (resourceType === 'zone') {
          newHistories = await getZoneHistories(resourceId);
        } else {
          newHistories = await getRecordHistories(resourceId);
        }
        setHistories(newHistories);
      } catch (err) {
        setError(`Failed to fetch ${resourceType} histories`);
      } finally {
        setLoading(false);
      }
    };

    fetchHistories();
  }, [resourceId, resourceType]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading histories...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="h-96 overflow-y-auto">
      {histories.length > 0 ? (
        histories.map(history => (
          <div key={history.id} className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">{history.log}</p>
            <p className="text-xs text-gray-400">
              {new Date(history.created_at).toLocaleString()}
            </p>
          </div>
        ))
      ) : (
        <p className="text-center p-4">No histories found</p>
      )}
    </div>
  );
};

export default HistoryList;
