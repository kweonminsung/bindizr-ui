'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const linkClasses = (path: string) =>
    `block p-2 rounded-sm hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
      pathname.startsWith(path) ? 'bg-white text-(--primary)' : ''
    }`;

  return (
    <aside className="w-60 bg-(--primary) p-4 flex flex-col text-white shadow-lg">
      <header className="mb-8 flex items-center">
        <div className="w-8 h-8 bg-white rounded-full mr-3"></div>
        <h1 className="text-xl font-bold">DNS Manager</h1>
      </header>
      <nav className="flex-grow">
        <ul className="space-y-2">
          <li>
            <Link href="/zones" className={linkClasses('/zones')}>
              Zones
            </Link>
          </li>
          <li>
            <Link href="/records" className={linkClasses('/records')}>
              Records
            </Link>
          </li>
          <li>
            <Link href="/settings" className={linkClasses('/settings')}>
              Settings
            </Link>
          </li>
        </ul>
      </nav>
      <footer className="text-center text-xs text-gray-200">
        <p>v1.0.0</p>
      </footer>
    </aside>
  );
}
