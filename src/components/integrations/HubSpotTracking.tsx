'use client';

import { useEffect } from 'react';

type HubSpotTrackingProps = {
  portalId: string;
};

export function HubSpotTracking({ portalId }: HubSpotTrackingProps) {
  useEffect(() => {
    if (document.getElementById('hs-script-loader')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'hs-script-loader';
    script.src = `https://js.hs-scripts.com/${portalId}.js`;
    script.async = true;
    document.body.appendChild(script);
  }, [portalId]);

  return null;
}
