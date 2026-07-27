import { useState } from "react";
import { Record } from "@/lib/types";
import { formatRecordValue } from "@/lib/recordValue";
import RecordForm from "./RecordForm";

interface RecordDetailsProps {
  record: Record;
  onRecordChanged: (record: Record) => void;
  /** Open straight into the edit form instead of the read-only view. */
  defaultEditing?: boolean;
}

export default function RecordDetails({
  record,
  onRecordChanged,
  defaultEditing = false,
}: RecordDetailsProps) {
  const [isEditing, setIsEditing] = useState(defaultEditing);

  if (isEditing) {
    return (
      <RecordForm
        record={record}
        onSuccess={(updatedRecord) => {
          setIsEditing(false);
          onRecordChanged(updatedRecord);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Record Details</h2>

      <div className="space-y-3">
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-lg text-gray-900">{record.name}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Value</p>
          <p className="text-lg text-gray-900 break-all">
            {formatRecordValue(record.value)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Type</p>
            <p className="text-lg text-gray-900">{record.record_type}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">TTL</p>
            <p className="text-lg text-gray-900">{record.ttl}</p>
          </div>
          {record.priority != null && (
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Priority</p>
              <p className="text-lg text-gray-900">{record.priority}</p>
            </div>
          )}
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Zone</p>
            <p className="text-lg text-gray-900">
              {record.zone_name ?? record.zone_id}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="btn-primary"
        >
          Edit Record
        </button>
      </div>
    </div>
  );
}
