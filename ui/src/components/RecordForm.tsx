"use client";

import { useEffect, useState } from "react";
import { createRecord, updateRecord } from "@/lib/api";
import { toOptionalNumber } from "@/lib/form";
import { inputToRecordValue, recordValueToInput } from "@/lib/recordValue";
import { Record, RECORD_TYPES, RecordType, Zone } from "@/lib/types";

interface RecordFormProps {
  zoneName?: string;
  record: Record | null;
  onSuccess: () => void;
  zones: Zone[];
}

interface RecordFormData {
  name: string;
  record_type: RecordType;
  value: string;
  ttl: string;
  priority: string;
  zone_name: string;
}

const defaultFormData: RecordFormData = {
  name: "",
  record_type: "A",
  value: "",
  ttl: "3600",
  priority: "10",
  zone_name: "",
};

export default function RecordForm({
  zoneName,
  record,
  onSuccess,
  zones,
}: RecordFormProps) {
  const [formData, setFormData] = useState<RecordFormData>({
    ...defaultFormData,
    zone_name: zoneName ?? "",
  });

  useEffect(() => {
    if (record) {
      setFormData({
        name: record.name,
        record_type: record.record_type,
        value: recordValueToInput(record.value),
        ttl: record.ttl?.toString() ?? "",
        priority: record.priority?.toString() ?? "",
        zone_name:
          record.zone_name ??
          zones.find((zone) => zone.id === record.zone_id)?.name ??
          "",
      });
      return;
    }

    setFormData({
      ...defaultFormData,
      zone_name: zoneName ?? "",
    });
  }, [record, zoneName, zones]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedZoneName = zoneName ?? formData.zone_name;
    if (!record && !selectedZoneName) {
      alert("Zone is required");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        record_type: formData.record_type,
        value: inputToRecordValue(formData.value),
        ttl: toOptionalNumber(formData.ttl),
        priority: toOptionalNumber(formData.priority),
      };

      if (record) {
        await updateRecord(record.id, payload);
      } else {
        await createRecord({
          ...payload,
          zone_name: selectedZoneName,
        });
      }
      onSuccess();
    } catch (error) {
      alert("Failed to save record");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {record ? "Edit Record" : "Create New Record"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full"
          />
        </div>
        <div>
          <label
            htmlFor="record_type"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Type
          </label>
          <select
            id="record_type"
            name="record_type"
            value={formData.record_type}
            onChange={handleChange}
            className="w-full"
          >
            {RECORD_TYPES.filter((type) => type !== "SOA").map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor="value"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Value
          </label>
          <textarea
            id="value"
            name="value"
            value={formData.value}
            onChange={handleChange}
            required
            rows={3}
            className="w-full"
          />
        </div>
        <div>
          <label
            htmlFor="ttl"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            TTL
          </label>
          <input
            type="number"
            id="ttl"
            name="ttl"
            value={formData.ttl}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Priority
          </label>
          <input
            type="number"
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        {!zoneName && !record && (
          <div className="md:col-span-2">
            <label
              htmlFor="zone_name"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Zone
            </label>
            <select
              id="zone_name"
              name="zone_name"
              value={formData.zone_name}
              onChange={handleChange}
              required
              className="w-full"
            >
              <option value="">Select a zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.name}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onSuccess} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {record ? "Update Record" : "Create Record"}
        </button>
      </div>
    </form>
  );
}
