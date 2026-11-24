import type { ImportZoneSummaryResponse } from "@/lib/types";

interface ImportSummaryProps {
  summary: ImportZoneSummaryResponse;
  preview: boolean;
  showParsed?: boolean;
}

export default function ImportSummary({
  summary,
  preview,
  showParsed = false,
}: ImportSummaryProps) {
  const counts = [
    ...(showParsed ? [{ label: "Parsed", value: summary.parsed }] : []),
    { label: preview ? "Would add" : "Added", value: summary.added },
    { label: preview ? "Would update" : "Updated", value: summary.updated },
    { label: preview ? "Would delete" : "Deleted", value: summary.deleted },
    { label: "Unchanged", value: summary.unchanged },
    { label: "Skipped", value: summary.skipped },
  ];

  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {counts.map(({ label, value }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt>{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
