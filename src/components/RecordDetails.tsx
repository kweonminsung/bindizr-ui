'use client';

import { Record } from '@/lib/types';

interface RecordDetailsProps {
  record: Record;
}

export default function RecordDetails({ record }: RecordDetailsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Record Details</h2>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-lg text-gray-900">{record.name}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Value</p>
          <p className="text-lg text-gray-900 break-all">{record.value}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Type</p>
            <p className="text-lg text-gray-900">{record.record_type}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">TTL</p>
            <p className="text-lg text-gray-900">{record.ttl}</p>
          </div>
          {record.priority != null && (
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Priority</p>
              <p className="text-lg text-gray-900">{record.priority}</p>
            </div>
          )}
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Zone ID</p>
            <p className="text-lg text-gray-900">{record.zone_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
