import { useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getRole } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { CreatedToken, Role, TsigKey } from "@/lib/types";
import Modal from "./Modal";
import BuiltinBadge from "./BuiltinBadge";
import RoleGrantsPanel, { RoleGrantsView } from "./RoleGrantsPanel";
import TabBar from "./TabBar";
import TokenDetails from "./TokenDetails";
import TokenForm from "./TokenForm";
import TokenList from "./TokenList";
import TsigKeyDetails from "./TsigKeyDetails";
import TsigKeyForm from "./TsigKeyForm";
import TsigKeyList from "./TsigKeyList";

type RoleTab = RoleGrantsView | "tokens" | "keys";

/** A role's metadata above its grants and the tokens and keys in it. */
export default function RoleDetails({ role: initialRole }: { role: Role }) {
  const { self, refresh: refreshConnectedToken } = useBindizrToken();
  const [role, setRole] = useState(initialRole);
  const [tab, setTab] = useState<RoleTab>("grants");
  const [tokenFormOpen, setTokenFormOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [keyFormOpen, setKeyFormOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<TsigKey | null>(null);
  // Remounts a list after a create made elsewhere in this view.
  const [listKey, setListKey] = useState(0);

  // The counts on the tabs come from the role, so any change rereads it.
  const refreshRole = () => {
    getRole(role.name)
      .then(setRole)
      .catch(() => {});
  };

  // The connected token's own grants decide which routes and buttons show,
  // so editing its role's grants rereads them too.
  const handleGrantsChange = () => {
    refreshRole();
    if (self?.role_name === role.name) {
      refreshConnectedToken();
    }
  };

  const tabs = [
    { id: "grants" as const, label: `Grants (${role.grant_count})` },
    { id: "tokens" as const, label: `API Tokens (${role.token_count})` },
    { id: "keys" as const, label: `TSIG Keys (${role.tsig_key_count})` },
    ...(role.builtin ? [] : [{ id: "grant" as const, label: "Add Grant" }]),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-800 break-all">
            {role.name}
          </h2>
          {role.builtin && (
            <BuiltinBadge title="The built-in role cannot be changed or deleted" />
          )}
        </div>
        <div className="space-y-2">
          {role.description && (
            <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-base text-gray-900 break-words">
                {role.description}
              </p>
            </div>
          )}
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-base text-gray-900">
              {formatDateTime(role.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        {/* Mounted throughout, so a half-filled grant survives a tab switch. */}
        <RoleGrantsPanel
          role={role}
          view={tab === "grants" || tab === "grant" ? tab : null}
          onViewChange={setTab}
          onChange={handleGrantsChange}
        />

        {tab === "tokens" && (
          <TokenList
            key={`tokens-${listKey}`}
            roleName={role.name}
            onCreateToken={() => setTokenFormOpen(true)}
            onChange={refreshRole}
          />
        )}

        {tab === "keys" && (
          <TsigKeyList
            key={`keys-${listKey}`}
            roleName={role.name}
            onCreateKey={() => setKeyFormOpen(true)}
            onChange={refreshRole}
          />
        )}
      </div>

      <Modal isOpen={tokenFormOpen} onClose={() => setTokenFormOpen(false)}>
        <TokenForm
          roleName={role.name}
          onSuccess={(created) => {
            setTokenFormOpen(false);
            setListKey((prev) => prev + 1);
            refreshRole();
            setCreatedToken(created);
          }}
          onCancel={() => setTokenFormOpen(false)}
        />
      </Modal>
      {createdToken && (
        <Modal isOpen wide onClose={() => setCreatedToken(null)}>
          <TokenDetails
            token={createdToken.token}
            secret={createdToken.secret}
          />
        </Modal>
      )}

      <Modal isOpen={keyFormOpen} onClose={() => setKeyFormOpen(false)}>
        <TsigKeyForm
          roleName={role.name}
          onSuccess={(tsigKey) => {
            setKeyFormOpen(false);
            setListKey((prev) => prev + 1);
            refreshRole();
            setCreatedKey(tsigKey);
          }}
          onCancel={() => setKeyFormOpen(false)}
        />
      </Modal>
      {createdKey && (
        <Modal isOpen wide onClose={() => setCreatedKey(null)}>
          <TsigKeyDetails tsigKey={createdKey} isNew />
        </Modal>
      )}
    </div>
  );
}
