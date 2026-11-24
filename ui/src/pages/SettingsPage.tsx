import AccountSettings from "@/components/AccountSettings";
import BindizrSettings from "@/components/BindizrSettings";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="General Settings" />
      <div className="space-y-6">
        <BindizrSettings />
        <AccountSettings />
      </div>
    </div>
  );
}
