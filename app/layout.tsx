import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Acme Widget API Assistant',
  description: 'Answers grounded in the Acme Widget API documentation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
