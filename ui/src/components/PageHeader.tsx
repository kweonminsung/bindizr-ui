import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 md:mb-6">
      <div className="min-w-0 flex-[1_1_min(100%,24rem)]">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-gray-600">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex max-w-full flex-wrap items-center gap-2 empty:hidden">
          {actions}
        </div>
      )}
    </header>
  );
}
