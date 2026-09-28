"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkPublishableKey, isClerkConfigured } from "@/lib/clerk-config";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) return children;
  return <ClerkProvider publishableKey={clerkPublishableKey}>{children}</ClerkProvider>;
}
