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
    return <p className="text-center text-text-secondary">Loading zones...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm font-light">
        <thead className="border-b border-border-color font-medium">
          <tr>
            <th scope="col" className="px-6 py-4 text-text-secondary">
              Zone Name
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-right text-text-secondary"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {zones.map(zone => (
            <tr
              key={zone.id}
              className="border-b border-border-color transition-colors hover:bg-background-light"
            >
              <td
                onClick={() => router.push(`/records?zoneId=${zone.id}`)}
                className="whitespace-nowrap px-6 py-4 font-medium cursor-pointer hover:text-primary"
              >
                {zone.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <button
                  onClick={() => onEditZone(zone)}
                  className="mr-4 font-medium text-secondary hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(zone.id)}
                  className="font-medium text-red-500 hover:underline"
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
