"use client";

import { useAnalytics } from "@/hooks/use-analytics";

/**
 * Invisible client component that tracks page views globally.
 * Drop into RootLayout to automatically record PAGE_VIEW events.
 */
export function AnalyticsPageTracker() {
  useAnalytics(); // registers PAGE_VIEW on mount/unmount per route
  return null;
}
