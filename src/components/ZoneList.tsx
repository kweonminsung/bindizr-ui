'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getZones, deleteZone } from '@/lib/api';
import { Zone } from '@/lib/types';

interface ZoneListProps {
  onEditZone: (zone: Zone) => void;
}

export default function ZoneList({ onEditZone }: ZoneListProps) {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchZones() {
      try {
        const data = await getZones();
        setZones(data);
      } catch (err) {
        setError('Failed to fetch zones');
      } finally {
        setLoading(false);
      }
    }
    fetchZones();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteZone(id);
      setZones(zones.filter(zone => zone.id !== id));
    } catch (error) {
      alert('Failed to delete zone');
    }
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading zones...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Zone Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {zones.map(zone => (
            <tr key={zone.id} className="transition-colors hover:bg-gray-50">
              <td
                onClick={() => router.push(`/records?zoneId=${zone.id}`)}
                className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-primary"
              >
                {zone.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <button
                  onClick={() => onEditZone(zone)}
                  className="mr-4 font-medium text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(zone.id)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
