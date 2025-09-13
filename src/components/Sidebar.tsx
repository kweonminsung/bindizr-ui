'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const linkClasses = (path: string) =>
    `block px-6 py-4 hover:bg-white hover:text-(--primary) transition-all duration-200 ease-in-out ${
      pathname.startsWith(path) ? 'bg-white text-(--primary)' : ''
    }`;

  return (
    <aside className="w-60 bg-(--primary) py-4 flex flex-col text-white shadow-lg">
      <header className="mb-8">
        <h1 className="text-center text-2xl">
          <span className="font-bold">DNS</span> Dashboard
        </h1>
      </header>
      <nav className="flex-grow">
        <ul>
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
        <p>
          Powered by{' '}
          <a target="_blank" href="https://github.com/kweonminsung/bindizr">
            Bindizr
          </a>
        </p>
      </footer>
    </aside>
  );
}
