"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSidebar = ["/records", "/zones", "/settings"].some((path) =>
    pathname.startsWith(path)
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {showSidebar && <Sidebar />}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
