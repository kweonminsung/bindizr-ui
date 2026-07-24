import { useState } from "react";
import ChevronDownIcon from "./icons/ChevronDownIcon";

interface FilterPanelProps {
  activeCount: number;
  onReset: () => void;
  children: React.ReactNode;
}

export default function FilterPanel({
  activeCount,
  onReset,
  children,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-4 pb-4">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-(--primary)"
      >
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="mt-3 rounded-md border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {children}
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onReset}
              disabled={activeCount === 0}
              className="text-sm font-medium text-gray-600 hover:underline disabled:text-gray-300 disabled:no-underline"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
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
    <div>
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
        className="w-full"
      />
    </div>
  );
}
