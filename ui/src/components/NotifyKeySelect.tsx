import { useEffect, useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { useToast } from "@/contexts/ToastContext";
import { getTsigKeys } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { TsigKey } from "@/lib/types";

interface NotifyKeySelectProps {
  id: string;
  /** The key's name; empty sends NOTIFY unsigned. */
  value: string;
  onChange: (name: string) => void;
}

/** Picks the TSIG key a secondary's NOTIFY is signed with. */
export default function NotifyKeySelect({
  id,
  value,
  onChange,
}: NotifyKeySelectProps) {
  const toast = useToast();
  const { allows } = useBindizrToken();
  // Listing keys needs access:manage; without it the name is typed.
  const canListKeys = allows("access:manage");
  const [tsigKeys, setTsigKeys] = useState<TsigKey[]>([]);

  useEffect(() => {
    if (!canListKeys) {
      return;
    }
    let active = true;
    getTsigKeys()
      .then((keys) => {
        if (active) setTsigKeys(keys);
      })
      .catch((fetchError) => {
        if (active) {
          toast.error(getErrorMessage(fetchError, "Failed to fetch TSIG keys"));
        }
      });
    return () => {
      active = false;
    };
  }, [canListKeys, toast]);

  if (!canListKeys) {
    return (
      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="TSIG key name; empty sends NOTIFY unsigned"
        className="w-full"
      />
    );
  }

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full"
    >
      <option value="">Send NOTIFY unsigned</option>
      {/* The current key stays listed even before the keys load. */}
      {value && !tsigKeys.some((key) => key.name === value) && (
        <option value={value}>{value}</option>
      )}
      {tsigKeys.map((key) => (
        <option key={key.id} value={key.name}>
          {key.name}
        </option>
      ))}
    </select>
  );
}
