'use client';

import { useState } from 'react';
import ZoneList from '@/components/ZoneList';
import RecordList from '@/components/RecordList';
import ZoneForm from '@/components/ZoneForm';
import RecordForm from '@/components/RecordForm';
import { Zone, Record } from '@/lib/types';

export default function Home() {
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
  };

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
  };

  return (
    <main className="flex min-h-screen flex-col items-start justify-start p-24">
      <h1 className="text-4xl font-bold mb-8">DNS Dashboard</h1>
      <div className="grid grid-cols-2 gap-8 w-full">
        <div>
          <ZoneList
            onSelectZone={setSelectedZoneId}
            onEditZone={handleEditZone}
          />
          <ZoneForm zone={editingZone} />
        </div>
        <div>
          {selectedZoneId ? (
            <>
              <RecordList
                zoneId={selectedZoneId}
                onEditRecord={handleEditRecord}
              />
              <RecordForm zoneId={selectedZoneId} record={editingRecord} />
            </>
          ) : (
            <p>Select a zone to see its records.</p>
          )}
        </div>
      </div>
    </main>
  );
}
