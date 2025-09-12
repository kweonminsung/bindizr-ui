import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DNS Dashboard',
  description: 'A dashboard for managing DNS zones and records.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background-dark text-foreground`}>
        <div className="flex h-screen">
          <aside className="w-64 bg-sidebar-bg p-6 flex flex-col text-white shadow-lg">
            <header className="mb-10 flex items-center space-x-3">
              {/* Placeholder for a logo */}
              <div className="w-8 h-8 bg-primary rounded-full"></div>
              <h1 className="text-xl font-bold">DNS Manager</h1>
            </header>
            <nav className="flex-grow">
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/zones"
                    className="block p-3 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 ease-in-out"
                  >
                    Zones
                  </Link>
                </li>
                <li>
                  <Link
                    href="/records"
                    className="block p-3 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 ease-in-out"
                  >
                    Records
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings"
                    className="block p-3 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 ease-in-out"
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </nav>
            <footer className="text-center text-xs text-text-secondary">
              <p>v1.0.0</p>
            </footer>
          </aside>
          <main className="flex-1 p-10 overflow-y-auto bg-background-light">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
