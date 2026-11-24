/** The fields a listing filters by, laid out by `ListToolbar`. */
interface FilterFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
}

export function FilterField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: FilterFieldProps) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-600 mb-1"
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 w-full max-w-full min-h-[2.125rem]"
      />
    </div>
  );
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The empty value is the unfiltered one and comes first. */
  options: readonly { value: string; label: string }[];
}

/** A filter over a fixed set of values rather than free text. */
export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: FilterSelectProps) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-600 mb-1"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 w-full max-w-full min-h-[2.125rem]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
