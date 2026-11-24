import type { TransferLogResponse, TransferResult } from "./types";

export const TRANSFER_RESULT_LABELS: Record<TransferResult, string> = {
  ok: "OK",
  refused: "Refused",
  failed: "Failed",
};

export function describeTransferType(transfer: TransferLogResponse): string {
  if (transfer.kind === "ixfr" && transfer.result === "ok")
    return transfer.incremental ? "IXFR delta" : "IXFR full";
  return transfer.kind.toUpperCase();
}
