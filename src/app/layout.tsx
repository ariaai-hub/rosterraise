import type { Metadata } from 'next';
import { Oswald, Inter } from 'next/font/google';
import './globals.css';

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RosterRaise — Your Team Store. Your Commission.',
  description: 'Stop chasing fundraisers nobody wants. RosterRaise gives your team thirty percent of every sale — custom koozies, hoodies, gear parents actually buy.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>{children}</body>
    </html>
  );
}