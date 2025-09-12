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
      <body className={`${inter.className} bg-gray-800 text-white`}>
        <div className="flex h-screen">
          <aside className="w-64 bg-gray-900 p-4">
            <h1 className="text-2xl font-bold mb-8">DNS Dashboard</h1>
            <nav>
              <ul>
                <li className="mb-4">
                  <Link href="/zones">
                    <p className="text-lg hover:text-gray-400">Zones</p>
                  </Link>
                </li>
                <li className="mb-4">
                  <Link href="/records">
                    <p className="text-lg hover:text-gray-400">Records</p>
                  </Link>
                </li>
                <li className="mb-4">
                  <Link href="/settings">
                    <p className="text-lg hover:text-gray-400">Settings</p>
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
