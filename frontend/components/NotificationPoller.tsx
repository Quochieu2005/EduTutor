"use client";

import { useEffect, useRef } from "react";
import { edututorApi, type ActorNotification } from "@/lib/edututor-api";
import { AUTH_SESSION_EVENT, getAuthSession } from "@/lib/auth-session";
import { toast } from "@/lib/toast";

const POLL_INTERVAL_MS = 30_000;
const MIN_REQUEST_GAP_MS = 10_000;

/** Keep the recipient inbox fresh without polling while the page is hidden. */
export function NotificationPoller() {
  const knownIds = useRef<Set<number> | null>(null);
  const sessionKey = useRef("");
  const lastRequestAt = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const session = getAuthSession();
      if (!session?.access || session.actorType === "admin") return;
      const key = `${session.actorType}:${session.access}`;
      const now = Date.now();
      if (now - lastRequestAt.current < MIN_REQUEST_GAP_MS) return;
      lastRequestAt.current = now;

      try {
        const page = session.actorType === "tutor"
          ? await edututorApi.tutorNotifications()
          : await edututorApi.notifications();
        if (cancelled) return;
        const records: ActorNotification[] = page.results;
        // A new login/session starts a clean baseline. Existing unread items
        // should not all pop again just because the user opened a new page.
        if (sessionKey.current !== key || knownIds.current === null) {
          sessionKey.current = key;
          knownIds.current = new Set(records.map((item) => item.id));
          return;
        }

        const known = knownIds.current;
        const fresh = records.filter((item) => !known.has(item.id)).reverse();
        records.forEach((item) => known.add(item.id));
        fresh.forEach((item) => toast.info(item.message, { title: item.title }));
      } catch {
        // Notification refresh is best effort. It must never interrupt the
        // page or show an error toast for a transient background request.
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(AUTH_SESSION_EVENT, refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(AUTH_SESSION_EVENT, refreshWhenVisible);
    };
  }, []);

  return null;
}
