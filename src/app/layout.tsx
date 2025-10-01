import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import Providers from './providers';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { isSetupComplete, isAccountEnabled } from '@/lib/db';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DNS Dashboard',
  description: 'A dashboard for managing DNS zones and records.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(getAuthOptions());
  const setupComplete = isSetupComplete();

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers session={session}>
          <div className="flex h-screen bg-gray-100">
            {session && setupComplete && <Sidebar />}
            <main className="flex-1 p-8 overflow-y-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
