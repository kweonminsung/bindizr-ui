import { useState } from "react";
import { notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useToast } from "@/contexts/ToastContext";
import Modal from "./Modal";

/** Every zone at once; a single zone is notified from its Sync tab. */
export default function NotifyAllZones() {
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
      toast.error(getErrorMessage(error, "Failed to send DNS NOTIFY"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-primary w-full sm:w-auto"
      >
        Notify All
      </button>

      <Modal isOpen={isOpen} onClose={close}>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Notify All Zones
        </h2>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Ask the secondaries to pull the latest data for every zone.
          </p>

          <label className="flex items-start space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={bumpSerial}
              onChange={(e) => setBumpSerial(e.target.checked)}
              className="mt-1"
            />
            <span>
              Bump every zone&apos;s serial first, so secondaries transfer even
              when nothing changed.
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
