import { useId } from "react";
import { SortOrder } from "@/lib/types";

interface SortOption {
  value: string;
  label: string;
}

interface SortControlProps {
  /** Only the fields the listing endpoint sorts by. */
  options: readonly SortOption[];
  sort: string;
  order: SortOrder;
  onChange: (sort: string, order: SortOrder) => void;
}

/** Picks which field a listing is sorted by, and which way. */
export default function SortControl({
  options,
  sort,
  order,
  onChange,
}: SortControlProps) {
  const ascending = order === "asc";
  // Two listings can share a screen, a list behind a details modal's own.
  const id = useId();

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1">
      <label htmlFor={id} className="sr-only">
        Sort by
      </label>
      <select
        id={id}
        value={sort}
        onChange={(e) => onChange(e.target.value, order)}
        className="min-h-[2.125rem] min-w-0 flex-1 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            Sort: {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(sort, ascending ? "desc" : "asc")}
        title={ascending ? "Ascending" : "Descending"}
        aria-label={`Sorted ${ascending ? "ascending" : "descending"}; click to reverse`}
        className="min-h-[2.125rem] w-9 shrink-0 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
      >
        {ascending ? "↑" : "↓"}
      </button>
    </div>
  );
}
