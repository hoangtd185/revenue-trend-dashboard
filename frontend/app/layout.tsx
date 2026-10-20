import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './admin.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Revenue Dashboard',
  description: 'Weekly revenue trend vs previous period',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
