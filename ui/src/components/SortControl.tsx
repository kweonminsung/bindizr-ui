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

  return (
    <div className="flex items-center gap-1">
      <label htmlFor="sort_field" className="sr-only">
        Sort by
      </label>
      <select
        id="sort_field"
        value={sort}
        onChange={(e) => onChange(e.target.value, order)}
        className="text-sm"
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
        className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
      >
        {ascending ? "↑" : "↓"}
      </button>
    </div>
  );
}
