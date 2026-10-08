"use client";

export type ActorType = "user" | "student" | "parent" | "tutor" | "admin";

export type StoredAuthSession = {
  access: string;
  refresh: string;
  actorType: ActorType;
  account: Record<string, unknown>;
  source?: "local";
  /** Last real activity, used to enforce the one-hour idle-session policy. */
  lastActivityAt?: number;
};

// Shared with the React session hook so it can wait for the browser value
// before deciding whether a visitor is signed in after an SSR page load.
export const AUTH_SESSION_STORAGE_KEY = "edututor_auth_session";
export const AUTH_SESSION_EVENT = "edututor:auth-session";
export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

// Guards on protected pages must not redirect to /login while an explicit
// logout navigation is already in progress. Without this flag, clearing
// localStorage synchronously can race the redirect and win with /login.
let authSignOutInProgress = false;

export function isAuthSignOutInProgress() {
  return authSignOutInProgress;
}

export function beginAuthSignOut() {
  authSignOutInProgress = true;
}

function actorFromAccessToken(token: string): ActorType | null {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as { actor?: unknown };
    return ["user", "student", "parent", "tutor", "admin"].includes(String(payload.actor))
      ? String(payload.actor) as ActorType
      : null;
  } catch {
    return null;
  }
}

export function getAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as StoredAuthSession;
    if (!session.access || !session.refresh || !session.actorType || !session.account) return null;
    const now = Date.now();
    // Upgrade sessions stored before the idle policy was introduced. They get
    // one fresh activity timestamp, then follow the same one-hour rule.
    const lastActivityAt = session.lastActivityAt ?? now;
    if (now - lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
      window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
      return null;
    }
    if (!session.lastActivityAt) {
      session.lastActivityAt = lastActivityAt;
      window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    // Sessions created before role detection was fixed can hold "student"
    // while their JWT is a tutor token. The signed JWT is the source of truth
    // for routing requests; this prevents a tutor token hitting /accounts/*.
    const tokenActor = actorFromAccessToken(session.access);
    if (tokenActor && tokenActor !== session.actorType) {
      session.actorType = tokenActor;
      window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: StoredAuthSession) {
  if (typeof window === "undefined") return;
  authSignOutInProgress = false;
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ ...session, lastActivityAt: Date.now() }));
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function promoteAuthSessionToStudent() {
  const session = getAuthSession();
  if (!session || session.actorType !== "user") return;
  saveAuthSession({
    ...session,
    actorType: "student",
    account: { ...session.account, account_type: "student" },
  });
}

export function touchAuthSession() {
  const session = getAuthSession();
  if (!session || typeof window === "undefined") return;
  // Avoid a write on every render/request while still keeping active users in.
  if ((Date.now() - (session.lastActivityAt ?? 0)) < 30_000) return;
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ ...session, lastActivityAt: Date.now() }));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}
