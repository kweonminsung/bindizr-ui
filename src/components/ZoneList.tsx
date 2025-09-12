'use client';

import { useEffect, useState } from 'react';
import { getZones, deleteZone } from '@/lib/api';
import { Zone } from '@/lib/types';

interface ZoneListProps {
  onSelectZone: (id: number) => void;
  onEditZone: (zone: Zone) => void;
}

export default function ZoneList({ onSelectZone, onEditZone }: ZoneListProps) {
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

  if (loading) return <p>Loading zones...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Zones</h2>
      <ul className="space-y-2">
        {zones.map(zone => (
          <li
            key={zone.id}
            className="p-2 border rounded flex justify-between items-center"
          >
            <span
              onClick={() => onSelectZone(zone.id)}
              className="cursor-pointer"
            >
              {zone.name}
            </span>
            <div>
              <button
                onClick={() => onEditZone(zone)}
                className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(zone.id)}
                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
