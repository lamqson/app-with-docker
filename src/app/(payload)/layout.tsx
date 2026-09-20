import type { ReactNode } from 'react';

import { isDatabaseConfigured } from '@/payload/database';
import '@/styles/globals.css';

type Args = {
  children: ReactNode;
};

export default async function Layout({ children }: Args) {
  if (!isDatabaseConfigured()) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-background text-foreground">{children}</body>
      </html>
    );
  }

  const { default: PayloadAdminLayout } = await import('./PayloadAdminLayout');
  return <PayloadAdminLayout>{children}</PayloadAdminLayout>;
}
