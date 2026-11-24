import { useEffect, useState } from "react";
import { ListCard } from "@/components/ListLayout";
import Modal from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import WebhookDeliveries from "@/components/WebhookDeliveries";
import WebhookForm from "@/components/WebhookForm";
import WebhookList from "@/components/WebhookList";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/lib/errors";
import {
  createWebhook,
  deleteWebhook,
  getWebhooks,
  updateWebhook,
  Webhook,
  WebhookCollection,
  WebhookInput,
} from "@/lib/webhooks";

type WebhookModal =
  | { kind: "form"; webhook: Webhook | null }
  | { kind: "deliveries"; webhook: Webhook };

export default function WebhooksPage() {
  const toast = useToast();
  const [modal, setModal] = useState<WebhookModal | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revision, setRevision] = useState(0);
  const [listing, setListing] = useState<
    ({ collection: WebhookCollection } | { error: string }) & {
      revision: number;
    }
  >();
  const current = listing?.revision === revision ? listing : undefined;
  const collection =
    current && "collection" in current ? current.collection : null;
  const listError = current && "error" in current ? current.error : null;

  useEffect(() => {
    const controller = new AbortController();

    async function fetchWebhooks() {
      try {
        const collection = await getWebhooks(controller.signal);
        if (!controller.signal.aborted) {
          setListing({ collection, revision });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListing({
            error: getErrorMessage(error, "Failed to load webhooks"),
            revision,
          });
        }
      }
    }

    fetchWebhooks();
    return () => controller.abort();
  }, [revision]);

  const openForm = (webhook: Webhook | null) => {
    setSaveError(null);
    setModal({ kind: "form", webhook });
  };

  const closeModal = () => {
    if (!saving) {
      setModal(null);
    }
  };

  const refreshWebhooks = () => setRevision((previous) => previous + 1);

  const handleSave = async (input: WebhookInput) => {
    if (modal?.kind !== "form" || saving) {
      return;
    }

    const webhook = modal.webhook;
    setSaving(true);
    setSaveError(null);

    try {
      if (webhook) {
        await updateWebhook(webhook.id, input);
      } else {
        await createWebhook(input);
      }
      toast.success(webhook ? "Webhook updated." : "Webhook created.");
      setModal(null);
      refreshWebhooks();
    } catch (error) {
      setSaveError(getErrorMessage(error, "Failed to save webhook"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (webhook: Webhook) => {
    if (!window.confirm(`Delete "${webhook.name}" and its delivery history?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteWebhook(webhook.id);
      toast.success("Webhook deleted.");
      refreshWebhooks();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete webhook"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Subscribe to events for operations performed through this UI."
        actions={
          <>
            <button
              type="button"
              aria-label="Refresh Webhooks"
              onClick={refreshWebhooks}
              disabled={!current || deleting}
              className="btn-secondary"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => openForm(null)}
              disabled={!collection || deleting}
              className="btn-primary"
            >
              Create Webhook
            </button>
          </>
        }
      />
      <ListCard>
        <WebhookList
          webhooks={collection?.items ?? null}
          error={listError}
          deleting={deleting}
          onEdit={openForm}
          onDeliveries={(webhook) => setModal({ kind: "deliveries", webhook })}
          onDelete={handleDelete}
        />
      </ListCard>
      {modal && (
        <Modal
          isOpen
          onClose={closeModal}
          wide={modal.kind === "deliveries"}
          structured
        >
          {modal.kind === "form" ? (
            <WebhookForm
              webhook={modal.webhook}
              operations={collection?.operations ?? []}
              saving={saving}
              error={saveError}
              onSubmit={handleSave}
              onCancel={closeModal}
            />
          ) : (
            <WebhookDeliveries key={modal.webhook.id} webhook={modal.webhook} />
          )}
        </Modal>
      )}
    </>
  );
}
