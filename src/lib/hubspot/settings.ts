import type { SiteSetting } from '@/payload/payload-types';

export function resolveHubspotPortalId(settings: SiteSetting | null): string | null {
  const fromSettings = settings?.hubspotPortalId?.trim();
  if (fromSettings) {
    return fromSettings;
  }

  const fromEnv = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID?.trim();
  return fromEnv || null;
}

export function resolveHubspotFormId(
  settings: SiteSetting | null,
  override?: string | null,
): string | null {
  const fromOverride = override?.trim();
  if (fromOverride) {
    return fromOverride;
  }

  const fromSettings = settings?.hubspotDemoFormId?.trim();
  if (fromSettings) {
    return fromSettings;
  }

  const fromEnv = process.env.NEXT_PUBLIC_HUBSPOT_DEMO_FORM_ID?.trim();
  return fromEnv || null;
}

export function resolveGraphqlEndpoint(settings: SiteSetting | null): string | null {
  const fromSettings = settings?.graphqlAgentEndpoint?.trim();
  if (fromSettings) {
    return fromSettings;
  }

  const fromEnv = process.env.GRAPHQL_ENDPOINT?.trim();
  return fromEnv || null;
}
