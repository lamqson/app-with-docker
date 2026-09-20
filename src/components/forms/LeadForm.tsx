import { getLocale } from 'next-intl/server';

import { resolveLocale } from '@/i18n/routing';
import { resolveHubspotFormId, resolveHubspotPortalId } from '@/lib/hubspot/settings';
import { getSiteSettings } from '@/lib/payload/queries';

import { HubSpotFormEmbed } from './HubSpotFormEmbed';
import { LocalLeadForm } from './LocalLeadForm';

type LeadFormProps = {
  formIdOverride?: string | null;
  source?: string;
};

export async function LeadForm({ formIdOverride = null, source = 'website' }: LeadFormProps) {
  const locale = resolveLocale(await getLocale());
  const settings = await getSiteSettings(locale);
  const portalId = resolveHubspotPortalId(settings);
  const formId = resolveHubspotFormId(settings, formIdOverride);

  if (portalId && formId) {
    return <HubSpotFormEmbed portalId={portalId} formId={formId} />;
  }

  return <LocalLeadForm source={source} />;
}
