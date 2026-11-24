import { useState } from "react";
import { notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useToast } from "@/contexts/ToastContext";
import Modal from "./Modal";

interface NotifyAllZonesProps {
  onSerialBumpFinished: () => void;
}

/** All zones at once; a single zone is notified from its Sync tab. */
export default function NotifyAllZones({
  onSerialBumpFinished,
}: NotifyAllZonesProps) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [bumpSerial, setBumpSerial] = useState(false);
  const [sending, setSending] = useState(false);

  const close = () => {
    setIsOpen(false);
    setBumpSerial(false);
  };

  const handleNotify = async () => {
    setSending(true);
    try {
      toast.success(await notifyZones(null, bumpSerial));
      close();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to send DNS NOTIFY");
      toast.error(
        bumpSerial
          ? `${message} (some serials may already have advanced)`
          : message,
      );
    } finally {
      if (bumpSerial) {
        onSerialBumpFinished();
      }
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary"
      >
        Notify All
      </button>

      <Modal isOpen={isOpen} onClose={close}>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Notify All Enabled Zones
        </h2>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Send NOTIFY to secondaries for all enabled zones.
          </p>

          <label className="flex items-start space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={bumpSerial}
              disabled={sending}
              onChange={(e) => setBumpSerial(e.target.checked)}
              className="mt-1"
            />
            <span>
              Bump the SOA serial for each enabled zone before sending NOTIFY.
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-2 pt-6">
          <button type="button" onClick={close} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNotify}
            disabled={sending}
            className="btn-primary"
          >
            {sending
              ? "Sending..."
              : bumpSerial
                ? "Bump serials & NOTIFY"
                : "Send NOTIFY"}
          </button>
        </div>
      </Modal>
    </>
  );
}
