import { ChangeActor, ChangeSource } from "@/lib/types";

export const CHANGE_SOURCE_LABELS: Record<ChangeSource, string> = {
  api: "HTTP API",
  socket: "CLI",
  nsupdate: "nsupdate",
  system: "System",
};

const CHANGE_SOURCE_STYLES: Record<ChangeSource, string> = {
  api: "bg-blue-100 text-blue-700",
  socket: "bg-amber-100 text-amber-700",
  nsupdate: "bg-purple-100 text-purple-700",
  system: "bg-gray-100 text-gray-600",
};

const CHANGE_SOURCE_HINTS: Record<ChangeSource, string> = {
  api: "Through the HTTP API.",
  socket: "Through the daemon socket (CLI).",
  nsupdate: "Through an RFC 2136 dynamic update.",
  system: "Written by bindizr itself — the DNSSEC signer or its scheduler.",
};

/** The credential behind a change, by kind and name. */
export function describeActor(actor: ChangeActor): string {
  return `${actor.kind === "token" ? "API token" : "TSIG key"} ${actor.name}`;
}

interface ChangeSourceBadgeProps {
  source: ChangeSource;
  className?: string;
}

/** The request path a change came over, with its meaning on hover. */
export default function ChangeSourceBadge({
  source,
  className,
}: ChangeSourceBadgeProps) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        CHANGE_SOURCE_STYLES[source] ?? "bg-gray-100 text-gray-600"
      }${className ? ` ${className}` : ""}`}
      title={CHANGE_SOURCE_HINTS[source] ?? "An unrecognised change source."}
    >
      {CHANGE_SOURCE_LABELS[source] ?? source}
    </span>
  );
}
