"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_SESSION_EVENT, AUTH_SESSION_STORAGE_KEY, getAuthSession } from "./auth-session";
import { logout as revokeApiSession } from "./api";

export function useEduUser() {
  // The server and the first browser render must be identical. Reading
  // localStorage during render briefly made every F5 look signed-out, causing
  // redirects and account API calls under the wrong role.
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setRaw(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY) ?? "");
    sync();
    window.addEventListener(AUTH_SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const user = useMemo(() => {
    if (!raw) return null;
    const session = getAuthSession();
    if (!session) return null;
    const account = session.account;
    const name = String(account.name ?? account.display_name ?? account.username ?? "Tài khoản");
    const email = String(account.email ?? "");
    return {
      id: String(account.id ?? "local"), fullName: name,
      firstName: name.split(" ").at(-1) ?? name, lastName: "",
      username: String(account.username ?? ""), imageUrl: String(account.avatar ?? ""),
      primaryEmailAddress: email ? { emailAddress: email } : null,
      primaryPhoneNumber: account.phone ? { phoneNumber: String(account.phone) } : null,
      publicMetadata: { role: session.actorType }, externalAccounts: [] as Array<never>,
      delete: async () => { throw new Error("API chưa hỗ trợ xóa tài khoản."); },
    };
  }, [raw]);
  return { isLoaded: raw !== null, isSignedIn: Boolean(user), user };
}

export function useEduClerk() {
  const router = useRouter();
  const openSignIn = useCallback((options?: { fallbackRedirectUrl?: string; forceRedirectUrl?: string }) => {
    const target = options?.forceRedirectUrl || options?.fallbackRedirectUrl;
    router.push(target ? `/login?returnTo=${encodeURIComponent(target)}` : "/login");
  }, [router]);
  const signOut = useCallback(async () => {
    // The local session is cleared before the best-effort API revoke, so a
    // cold backend never blocks navigation. Client navigation keeps the app
    // shell mounted and avoids a full document reload after every logout.
    void revokeApiSession();
    router.replace("/");
  }, [router]);
  return { openSignIn, signOut };
}

export function EduUserButton() {
  const { user } = useEduUser();
  const { signOut } = useEduClerk();
  if (!user) return null;
  return <button type="button" aria-label="Đăng xuất" title="Đăng xuất" onClick={() => void signOut()} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"><LogoutOutlined /></button>;
}
