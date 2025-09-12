'use client';

import { useState, useEffect } from 'react';
import { createRecord, updateRecord } from '@/lib/api';
import { Record } from '@/lib/types';

interface RecordFormProps {
  zoneId?: number;
  record: Record | null;
  onSuccess: () => void;
}

export default function RecordForm({
  zoneId,
  record,
  onSuccess,
}: RecordFormProps) {
  const [formData, setFormData] = useState<Omit<Record, 'id'>>({
    name: '',
    record_type: 'A',
    value: '',
    ttl: 3600,
    priority: 10,
    zone_id: 0,
  });

  useEffect(() => {
    if (record) {
      setFormData(record);
    }
  }, [record]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const zone_id_to_use = zoneId ?? (formData as Record).zone_id;
      if (!zone_id_to_use) {
        alert('Zone ID is required');
        return;
      }
      if (record) {
        await updateRecord({
          ...formData,
          id: record.id,
          zone_id: zone_id_to_use,
        });
      } else {
        await createRecord({ ...formData, zone_id: zone_id_to_use });
      }
      onSuccess();
    } catch (error) {
      alert('Failed to save record');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      record_type: 'A',
      value: '',
      ttl: 3600,
      priority: 10,
      zone_id: 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">
        {record ? 'Edit Record' : 'Create Record'}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label htmlFor="name" className="mb-1 text-sm font-medium">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="record_type" className="mb-1 text-sm font-medium">
            Type
          </label>
          <select
            id="record_type"
            name="record_type"
            value={formData.record_type}
            onChange={handleChange}
            className="p-2 border rounded"
          >
            <option value="A">A</option>
            <option value="AAAA">AAAA</option>
            <option value="CNAME">CNAME</option>
            <option value="MX">MX</option>
            <option value="TXT">TXT</option>
            <option value="NS">NS</option>
            <option value="SOA">SOA</option>
            <option value="SRV">SRV</option>
            <option value="PTR">PTR</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="value" className="mb-1 text-sm font-medium">
            Value
          </label>
          <input
            type="text"
            id="value"
            name="value"
            value={formData.value}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="ttl" className="mb-1 text-sm font-medium">
            TTL
          </label>
          <input
            type="number"
            id="ttl"
            name="ttl"
            value={formData.ttl}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        {!zoneId && !record && (
          <div className="flex flex-col">
            <label htmlFor="zone_id" className="mb-1 text-sm font-medium">
              Zone ID
            </label>
            <input
              type="number"
              id="zone_id"
              name="zone_id"
              value={(formData as Record).zone_id}
              onChange={handleChange}
              className="p-2 border rounded"
            />
          </div>
        )}
        <div className="flex flex-col">
          <label htmlFor="priority" className="mb-1 text-sm font-medium">
            Priority
          </label>
          <input
            type="number"
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {record ? 'Update' : 'Create'}
      </button>
      {record && (
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
