'use client';

import { Record } from '@/lib/types';

interface RecordDetailsProps {
  record: Record;
}

export default function RecordDetails({ record }: RecordDetailsProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{record.name}</h2>
      <p>
        <strong>Type:</strong> {record.record_type}
      </p>
      <p>
        <strong>Value:</strong> {record.value}
      </p>
      <p>
        <strong>TTL:</strong> {record.ttl}
      </p>
      {record.priority && (
        <p>
          <strong>Priority:</strong> {record.priority}
        </p>
      )}
      <p>
        <strong>Zone ID:</strong> {record.zone_id}
      </p>
    </div>
  );
}
