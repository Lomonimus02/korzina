"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * Send an analytics event to /api/analytics/track.
 * Fire-and-forget — errors are silently logged.
 */
async function sendEvent(type: string, page: string, meta?: Record<string, unknown>) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, page, meta }),
    });
  } catch (err) {
    // Non-critical — don't break the UI
    console.error("[Analytics]", err);
  }
}

/**
 * Send an analytics event using navigator.sendBeacon for reliability
 * when the page is being unloaded (tab close, navigation away).
 */
function sendBeaconEvent(type: string, page: string, meta?: Record<string, unknown>) {
  try {
    const data = JSON.stringify({ type, page, meta });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/track",
        new Blob([data], { type: "application/json" })
      );
    } else {
      // Fallback for environments without sendBeacon
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Non-critical
  }
}

/**
 * Custom hook for behavioral analytics.
 *
 * - Automatically tracks PAGE_VIEW events with duration on unmount / route change.
 * - Uses sendBeacon for reliable delivery even on tab close.
 * - Returns `trackClick(buttonId)` for explicit button-click tracking.
 */
export function useAnalytics() {
  const pathname = usePathname();
  const startTimeRef = useRef<number>(Date.now());
  const pathnameRef = useRef<string>(pathname);

  // Keep pathname ref in sync
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Reset timer on every route change & send PAGE_VIEW for previous page
  useEffect(() => {
    startTimeRef.current = Date.now();

    return () => {
      const duration = Date.now() - startTimeRef.current;
      // Only record meaningful visits (> 500 ms)
      if (duration > 500) {
        // Use sendBeacon for reliable delivery during cleanup
        sendBeaconEvent("PAGE_VIEW", pathname, { duration });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Handle browser/tab close — sendBeacon fires reliably on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const duration = Date.now() - startTimeRef.current;
      if (duration > 500) {
        sendBeaconEvent("PAGE_VIEW", pathnameRef.current, { duration });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const trackClick = useCallback(
    (buttonId: string) => {
      sendEvent("BUTTON_CLICK", pathname, { buttonId });
    },
    [pathname],
  );

  return { trackClick };
}
