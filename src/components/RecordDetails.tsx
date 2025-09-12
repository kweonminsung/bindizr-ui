'use client';

import { Record } from '@/lib/types';

interface RecordDetailsProps {
  record: Record;
}

export default function RecordDetails({ record }: RecordDetailsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Record Details</h2>

      <div className="space-y-4">
        <div className="p-4 bg-background-dark rounded-md">
          <p className="text-sm text-text-secondary">Name</p>
          <p className="text-lg text-white">{record.name}</p>
        </div>
        <div className="p-4 bg-background-dark rounded-md">
          <p className="text-sm text-text-secondary">Value</p>
          <p className="text-lg text-white break-all">{record.value}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-background-dark rounded-md">
            <p className="text-sm text-text-secondary">Type</p>
            <p className="text-lg text-white">{record.record_type}</p>
          </div>
          <div className="p-4 bg-background-dark rounded-md">
            <p className="text-sm text-text-secondary">TTL</p>
            <p className="text-lg text-white">{record.ttl}</p>
          </div>
          {record.priority != null && (
            <div className="p-4 bg-background-dark rounded-md">
              <p className="text-sm text-text-secondary">Priority</p>
              <p className="text-lg text-white">{record.priority}</p>
            </div>
          )}
          <div className="p-4 bg-background-dark rounded-md">
            <p className="text-sm text-text-secondary">Zone ID</p>
            <p className="text-lg text-white">{record.zone_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
