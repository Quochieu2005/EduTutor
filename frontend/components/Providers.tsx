"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/lib/auth-context";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </AuthProvider>
    </ClerkProvider>
  );
}
