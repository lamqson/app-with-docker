import type { Metadata } from 'next';

import AdminSetupRequired from '@/components/admin/AdminSetupRequired';
import { isDatabaseConfigured } from '@/payload/database';

type Args = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
};

export async function generateMetadata({ params, searchParams }: Args): Promise<Metadata> {
  if (!isDatabaseConfigured()) {
    return { title: 'CMS admin setup required' };
  }

  const config = (await import('@payload-config')).default;
  const { generatePageMetadata } = await import('@payloadcms/next/views');

  return generatePageMetadata({ config, params, searchParams });
}

export default async function Page(props: Args) {
  if (!isDatabaseConfigured()) {
    return <AdminSetupRequired />;
  }

  const { default: PayloadAdminPage } = await import('./PayloadAdminPage');
  return <PayloadAdminPage {...props} />;
}
