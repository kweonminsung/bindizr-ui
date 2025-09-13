'use client';

import { useState, useEffect } from 'react';
import { createZone, updateZone } from '@/lib/api';
import { Zone } from '@/lib/types';

interface ZoneFormProps {
  zone: Zone | null;
  onSuccess: () => void;
}

export default function ZoneForm({ zone, onSuccess }: ZoneFormProps) {
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
      } else {
        await createZone(formData);
      }
      onSuccess();
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {zone ? 'Edit Zone' : 'Create New Zone'}
      </h2>

      {/* General Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          General
        </h3>
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
              htmlFor="admin_email"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Admin Email
            </label>
            <input
              type="email"
              id="admin_email"
              name="admin_email"
              value={formData.admin_email}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="primary_ns"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Primary NS
            </label>
            <input
              type="text"
              id="primary_ns"
              name="primary_ns"
              value={formData.primary_ns}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="primary_ns_ip"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Primary NS IP
            </label>
            <input
              type="text"
              id="primary_ns_ip"
              name="primary_ns_ip"
              value={formData.primary_ns_ip}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Timing Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Timing
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              htmlFor="refresh"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Refresh
            </label>
            <input
              type="number"
              id="refresh"
              name="refresh"
              value={formData.refresh}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="retry"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Retry
            </label>
            <input
              type="number"
              id="retry"
              name="retry"
              value={formData.retry}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="expire"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Expire
            </label>
            <input
              type="number"
              id="expire"
              name="expire"
              value={formData.expire}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="minimum_ttl"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Minimum TTL
            </label>
            <input
              type="number"
              id="minimum_ttl"
              name="minimum_ttl"
              value={formData.minimum_ttl}
              onChange={handleChange}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="serial"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Serial
            </label>
            <input
              type="number"
              id="serial"
              name="serial"
              value={formData.serial}
              onChange={handleChange}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onSuccess}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover"
        >
          {zone ? 'Update Zone' : 'Create Zone'}
        </button>
      </div>
    </form>
  );
}
