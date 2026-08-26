import AccountSettings from "@/components/AccountSettings";
import BindizrSettings from "@/components/BindizrSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <BindizrSettings />
      <AccountSettings />
    </div>
  );
}
