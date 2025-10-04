"use client";

import DnsSyncSettings from "@/components/DnsSyncSettings";
import DnsControls from "@/components/DnsControls";

export default function DnsSettingsPage() {
  return (
    <div>
      <DnsControls />
      <DnsSyncSettings />
    </div>
  );
}
