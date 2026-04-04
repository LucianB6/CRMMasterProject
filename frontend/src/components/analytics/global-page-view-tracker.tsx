'use client';

import { usePathname } from 'next/navigation';
import * as React from 'react';

import { resolveRouteName, trackPageView } from '../../lib/analytics';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('salesway_token');
};

export function GlobalPageViewTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = React.useRef<string | null>(null);
  const isProduction = process.env.NODE_ENV === 'production';

  React.useEffect(() => {
    if (!isProduction) return;
    if (!pathname) return;
    if (lastTrackedPathRef.current === pathname) return;

    const token = getAuthToken();
    if (!token) return;

    lastTrackedPathRef.current = pathname;

    void trackPageView(
      {
        path: pathname,
        routeName: resolveRouteName(pathname),
        source: 'web',
        durationSeconds: null,
      },
      token
    ).catch((error) => {
      console.debug('Page view tracking failed', error);
    });
  }, [isProduction, pathname]);

  return null;
}
