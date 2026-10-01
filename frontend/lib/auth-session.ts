"use client";

export type ActorType = "user" | "student" | "parent" | "tutor" | "admin";

export type StoredAuthSession = {
  access: string;
  refresh: string;
  actorType: ActorType;
  account: Record<string, unknown>;
  source?: "local";
};

const STORAGE_KEY = "edututor_auth_session";
export const AUTH_SESSION_EVENT = "edututor:auth-session";

export function getAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as StoredAuthSession;
    if (!session.access || !session.refresh || !session.actorType || !session.account) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: StoredAuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}
