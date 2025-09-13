'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getZones, deleteZone } from '@/lib/api';
import { Zone } from '@/lib/types';
import Modal from './Modal';
import ZoneDetails from './ZoneDetails';

interface ZoneListProps {
  onEditZone: (zone: Zone) => void;
  onCreateZone: () => void;
}

export default function ZoneList({ onEditZone, onCreateZone }: ZoneListProps) {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zonesPerPage] = useState(10);

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
    if (window.confirm('Are you sure you want to delete this zone?')) {
      try {
        await deleteZone(id);
        setZones(zones.filter(zone => zone.id !== id));
      } catch (error) {
        alert('Failed to delete zone');
      }
    }
  };

  const handleShowDetails = (zone: Zone) => {
    setSelectedZone(zone);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedZone(null);
    setIsDetailModalOpen(false);
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading zones...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const indexOfLastZone = currentPage * zonesPerPage;
  const indexOfFirstZone = indexOfLastZone - zonesPerPage;
  const currentZones = zones.slice(indexOfFirstZone, indexOfLastZone);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

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
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Primary NS
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Admin Email
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
          {currentZones.map(zone => (
            <tr key={zone.id} className="transition-colors hover:bg-gray-50">
              <td
                onClick={() => router.push(`/records?zoneId=${zone.id}`)}
                className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-(--primary)"
              >
                {zone.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                {zone.primary_ns}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                {zone.admin_email}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <button
                  onClick={() => handleShowDetails(zone)}
                  className="mr-4 font-medium text-green-600 hover:underline"
                >
                  Details
                </button>
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
      {selectedZone && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetails}>
          <ZoneDetails zone={selectedZone} />
        </Modal>
      )}
      <div className="flex justify-between items-center p-4">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstZone + 1}</span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(indexOfLastZone, zones.length)}
            </span>{' '}
            of <span className="font-medium">{zones.length}</span> results
          </p>
        </div>
        <div className="flex items-center">
          <div className="flex">
            {Array.from(
              { length: Math.ceil(zones.length / zonesPerPage) },
              (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`px-3 py-1 mx-1 rounded-md text-sm font-medium ${
                    currentPage === i + 1
                      ? 'bg-(--primary) text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              )
            )}
          </div>
          <button onClick={onCreateZone} className="btn-primary ml-4">
            Create Zone
          </button>
        </div>
      </div>
    </div>
  );
}
