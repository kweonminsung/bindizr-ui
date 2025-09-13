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
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {record ? 'Edit Record' : 'Create New Record'}
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
        <div className="md:col-span-2">
          <label
            htmlFor="value"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Value
          </label>
          <input
            type="text"
            id="value"
            name="value"
            value={formData.value}
            onChange={handleChange}
            required
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
        {!zoneId && !record && (
          <div>
            <label
              htmlFor="zone_id"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Zone ID
            </label>
            <input
              type="number"
              id="zone_id"
              name="zone_id"
              value={(formData as Record).zone_id}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onSuccess} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {record ? 'Update Record' : 'Create Record'}
        </button>
      </div>
    </form>
  );
}
