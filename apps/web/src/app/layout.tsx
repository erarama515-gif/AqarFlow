import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'AqarFlow — Real Estate CRM',
  description: 'CRM عقاري متخصص لمنطقة MENA',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
