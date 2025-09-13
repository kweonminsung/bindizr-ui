'use client';

import { Zone } from '@/lib/types';

interface ZoneDetailsProps {
  zone: Zone;
}

export default function ZoneDetails({ zone }: ZoneDetailsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Zone Details</h2>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-lg text-gray-900">{zone.name}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-500">Admin Email</p>
          <p className="text-lg text-gray-900 break-all">{zone.admin_email}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Primary NS</p>
            <p className="text-lg text-gray-900">{zone.primary_ns}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Primary NS IP</p>
            <p className="text-lg text-gray-900">{zone.primary_ns_ip}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">TTL</p>
            <p className="text-lg text-gray-900">{zone.ttl}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Serial</p>
            <p className="text-lg text-gray-900">{zone.serial}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Refresh</p>
            <p className="text-lg text-gray-900">{zone.refresh}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Retry</p>
            <p className="text-lg text-gray-900">{zone.retry}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Expire</p>
            <p className="text-lg text-gray-900">{zone.expire}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Minimum TTL</p>
            <p className="text-lg text-gray-900">{zone.minimum_ttl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
