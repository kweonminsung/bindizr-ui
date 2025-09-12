'use client';

import { useState, useEffect } from 'react';
import { createZone, updateZone } from '@/lib/api';
import { Zone } from '@/lib/types';

interface ZoneFormProps {
  zone: Zone | null;
}

export default function ZoneForm({ zone }: ZoneFormProps) {
  const [formData, setFormData] = useState<Omit<Zone, 'id'>>({
    name: '',
    primary_ns: '',
    primary_ns_ip: '',
    admin_email: '',
    ttl: 3600,
    serial: 2025100101,
    refresh: 7200,
    retry: 3600,
    expire: 604800,
    minimum_ttl: 3600,
  });

  useEffect(() => {
    if (zone) {
      setFormData(zone);
    }
  }, [zone]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (zone) {
        await updateZone({ ...formData, id: zone.id });
        alert('Zone updated successfully');
      } else {
        await createZone(formData);
        alert('Zone created successfully');
      }
      // Optionally, refresh the zone list
    } catch (error) {
      alert('Failed to save zone');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      primary_ns: '',
      primary_ns_ip: '',
      admin_email: '',
      ttl: 3600,
      serial: 2025100101,
      refresh: 7200,
      retry: 3600,
      expire: 604800,
      minimum_ttl: 3600,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">
        {zone ? 'Edit Zone' : 'Create Zone'}
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
          <label htmlFor="primary_ns" className="mb-1 text-sm font-medium">
            Primary NS
          </label>
          <input
            type="text"
            id="primary_ns"
            name="primary_ns"
            value={formData.primary_ns}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="primary_ns_ip" className="mb-1 text-sm font-medium">
            Primary NS IP
          </label>
          <input
            type="text"
            id="primary_ns_ip"
            name="primary_ns_ip"
            value={formData.primary_ns_ip}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="admin_email" className="mb-1 text-sm font-medium">
            Admin Email
          </label>
          <input
            type="email"
            id="admin_email"
            name="admin_email"
            value={formData.admin_email}
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
        <div className="flex flex-col">
          <label htmlFor="serial" className="mb-1 text-sm font-medium">
            Serial
          </label>
          <input
            type="number"
            id="serial"
            name="serial"
            value={formData.serial}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="refresh" className="mb-1 text-sm font-medium">
            Refresh
          </label>
          <input
            type="number"
            id="refresh"
            name="refresh"
            value={formData.refresh}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="retry" className="mb-1 text-sm font-medium">
            Retry
          </label>
          <input
            type="number"
            id="retry"
            name="retry"
            value={formData.retry}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="expire" className="mb-1 text-sm font-medium">
            Expire
          </label>
          <input
            type="number"
            id="expire"
            name="expire"
            value={formData.expire}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="minimum_ttl" className="mb-1 text-sm font-medium">
            Minimum TTL
          </label>
          <input
            type="number"
            id="minimum_ttl"
            name="minimum_ttl"
            value={formData.minimum_ttl}
            onChange={handleChange}
            className="p-2 border rounded"
          />
        </div>
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {zone ? 'Update' : 'Create'}
      </button>
      {zone && (
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
