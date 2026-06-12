import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hontal Delivery Platform',
  description: 'Last-mile delivery operations for SME distributors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans">{children}</body>
    </html>
  );
}
