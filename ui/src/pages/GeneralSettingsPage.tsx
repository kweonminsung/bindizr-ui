import AccountSettings from "@/components/AccountSettings";
import BindizrSettings from "@/components/BindizrSettings";

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <BindizrSettings />
      <AccountSettings />
    </div>
  );
}
