"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { useMemo, useSyncExternalStore } from "react";
import { AUTH_SESSION_EVENT, clearAuthSession, getAuthSession } from "./auth-session";

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_SESSION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_SESSION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useEduUser() {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem("edututor_auth_session") ?? "", () => "");
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
  return { isLoaded: true, isSignedIn: Boolean(user), user };
}

function openSignIn(options?: { fallbackRedirectUrl?: string; forceRedirectUrl?: string }) {
  if (typeof window === "undefined") return;
  const target = options?.forceRedirectUrl || options?.fallbackRedirectUrl;
  window.location.assign(target ? `/login?returnTo=${encodeURIComponent(target)}` : "/login");
}

export function useEduClerk() {
  return { openSignIn, signOut: async () => { clearAuthSession(); window.location.assign("/login"); } };
}

export function EduUserButton() {
  const { user } = useEduUser();
  const { signOut } = useEduClerk();
  if (!user) return null;
  return <button type="button" aria-label="Đăng xuất" title="Đăng xuất" onClick={() => void signOut()} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"><LogoutOutlined /></button>;
}
