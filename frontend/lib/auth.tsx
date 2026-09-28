"use client";

import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import { isClerkConfigured } from "./clerk-config";

const useGuestUser = (() => ({ isLoaded: true, isSignedIn: false, user: null })) as typeof useUser;
const useGuestClerk = (() => ({
  openSignIn: (options?: { fallbackRedirectUrl?: string; forceRedirectUrl?: string }) => {
    if (typeof window === "undefined") return;
    const returnTo = options?.forceRedirectUrl || options?.fallbackRedirectUrl;
    window.location.assign(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login");
  },
  signOut: async () => {
    if (typeof window !== "undefined") window.location.assign("/login");
  },
})) as unknown as typeof useClerk;

export const useEduUser: typeof useUser = isClerkConfigured ? useUser : useGuestUser;
export const useEduClerk: typeof useClerk = isClerkConfigured ? useClerk : useGuestClerk;

export function EduUserButton() {
  return isClerkConfigured ? <UserButton /> : null;
}
