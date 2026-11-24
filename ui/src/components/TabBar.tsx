interface Tab<T extends string> {
  id: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}

export default function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: TabBarProps<T>) {
  return (
    <div className="flex flex-wrap gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
          className={`border-b-2 px-2 py-2 text-sm font-medium transition-colors @sm:px-3 ${
            active === tab.id
              ? "border-(--primary) text-(--primary)"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
