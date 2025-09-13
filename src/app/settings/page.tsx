'use client';

import DnsSyncSettings from '@/components/DnsSyncSettings';
import DnsControls from '@/components/DnsControls';

export default function SettingsPage() {
  return (
    <div>
      <DnsControls />
      <DnsSyncSettings />
    </div>
  );
}
