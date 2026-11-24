interface SelectionButtonsProps {
  canSelectAll: boolean;
  canClear: boolean;
  onSelectAll: () => void;
  onClear: () => void;
}

export default function SelectionButtons({
  canSelectAll,
  canClear,
  onSelectAll,
  onClear,
}: SelectionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSelectAll}
        disabled={!canSelectAll}
        className="btn-secondary"
      >
        Select all
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={!canClear}
        className="btn-secondary"
      >
        Clear selection
      </button>
    </div>
  );
}
