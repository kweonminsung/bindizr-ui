import { useEffect, useState } from "react";
import { getTsigKey } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { TsigKeyResponse, TsigKeyWithSecret } from "@/lib/types";
import CredentialSecret from "./CredentialSecret";
import RoleNote from "./RoleNote";
import { useToast } from "@/contexts/ToastContext";

interface TsigKeyDetailsProps {
  tsigKey: TsigKeyResponse | TsigKeyWithSecret;
  isNew?: boolean;
}

export default function TsigKeyDetails({
  tsigKey,
  isNew = false,
}: TsigKeyDetailsProps) {
  const toast = useToast();
  const [detail, setDetail] = useState(tsigKey);
  const [loading, setLoading] = useState(false);
  const secret = "secret" in detail ? detail.secret : undefined;

  useEffect(() => {
    setDetail(tsigKey);

    // The list response omits secrets, so fetch the key on its own to read one.
    if ("secret" in tsigKey) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    getTsigKey(tsigKey.name)
      .then((fetched) => {
        if (active) {
          setDetail(fetched);
        }
      })
      .catch((fetchError) => {
        if (active) {
          toast.error(getErrorMessage(fetchError, "Failed to fetch TSIG key"));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [tsigKey, toast]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 wrap-anywhere">
          {isNew ? "TSIG Key Created" : detail.name}
        </h2>

        <CredentialSecret
          key={tsigKey.id}
          secret={secret}
          loading={loading}
          initiallyRevealed={isNew}
        />

        <div className="space-y-2">
          {isNew && (
            <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-base text-gray-900 wrap-anywhere">
                {detail.name}
              </p>
            </div>
          )}
          <div className="grid gap-2 @xs:grid-cols-2">
            <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Algorithm</p>
              <p className="text-base text-gray-900">{detail.algorithm}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-base text-gray-900">
                {formatDateTime(detail.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <RoleNote roleName={detail.role_name} holder="key" />
    </div>
  );
}
