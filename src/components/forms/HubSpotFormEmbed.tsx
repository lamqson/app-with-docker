'use client';

import Script from 'next/script';
import { useEffect, useId, useState } from 'react';

type HubSpotFormEmbedProps = {
  formId: string;
  portalId: string;
};

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (options: {
          formId: string;
          portalId: string;
          region?: string;
          target: string;
        }) => void;
      };
    };
  }
}

export function HubSpotFormEmbed({ formId, portalId }: HubSpotFormEmbedProps) {
  const targetId = useId().replace(/:/g, '');
  const [scriptReady, setScriptReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !scriptReady || !window.hbspt) {
      return;
    }

    window.hbspt.forms.create({
      formId,
      portalId,
      region: 'na1',
      target: `#${targetId}`,
    });
  }, [formId, mounted, portalId, scriptReady, targetId]);

  return (
    <div className="surface-card mt-8 p-6">
      <Script
        src="https://js.hsforms.net/forms/embed/v2.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div id={targetId} />
    </div>
  );
}
