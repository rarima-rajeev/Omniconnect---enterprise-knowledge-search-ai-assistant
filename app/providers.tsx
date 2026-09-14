'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

interface AnalyticsContextType {
  captureEvent: (eventName: string, properties?: Record<string, any>) => void;
  isPostHogReady: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  captureEvent: () => {},
  isPostHogReady: false,
});

export const useAnalytics = () => useContext(AnalyticsContext);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (key && !key.includes('phc_...')) {
      try {
        posthog.init(key, {
          api_host: host,
          person_profiles: 'identified_only',
          capture_pageview: false,
          loaded: () => {
            setIsReady(true);
          },
        });
      } catch (e) {
        console.warn('PostHog initialization error:', e);
      }
    } else {
      // In simulated mode, flag ready so app functions smoothly
      setIsReady(true);
    }
  }, []);

  const captureEvent = (eventName: string, properties?: Record<string, any>) => {
    if (posthog.__loaded) {
      posthog.capture(eventName, properties);
    } else {
      // Simulated client-side log for developer console
      console.log(`[PostHog Client Telemetry] ${eventName}:`, properties);
    }
  };

  return (
    <PHProvider client={posthog}>
      <AnalyticsContext.Provider value={{ captureEvent, isPostHogReady: isReady }}>
        {children}
      </AnalyticsContext.Provider>
    </PHProvider>
  );
}
