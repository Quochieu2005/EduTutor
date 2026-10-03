"use client";

import { useEffect } from "react";
import { getAuthSession, touchAuthSession } from "@/lib/auth-session";

/**
 * Keeps a signed-in local session alive only while the person is genuinely
 * using the site. A periodic check also removes an idle session in an already
 * open browser tab, instead of waiting for the next API call.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "focus"];
    const onActivity = () => touchAuthSession();
    activityEvents.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    const checkIdle = window.setInterval(() => { getAuthSession(); }, 30_000);
    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(checkIdle);
    };
  }, []);
  return children;
}
