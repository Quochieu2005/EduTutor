"use client";

import { FacebookFilled } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginWithSocial } from "@/lib/api";
import { saveAuthSession } from "@/lib/auth-session";

type GoogleCredential = { credential?: string };
type FacebookLoginResponse = { authResponse?: { accessToken?: string }; status?: string };

declare global {
  interface Window {
    google?: { accounts: { id: { initialize(options: { client_id: string; callback: (result: GoogleCredential) => void }): void; renderButton(element: HTMLElement, options: Record<string, unknown>): void } } };
    FB?: { init(options: Record<string, unknown>): void; login(callback: (result: FacebookLoginResponse) => void, options: { scope: string }): void };
    fbAsyncInit?: () => void;
  }
}

function message(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" ? detail : "Không thể đăng nhập bằng mạng xã hội. Vui lòng thử lại.";
}

export function SocialLoginButtons({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const googleButton = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [facebookReady, setFacebookReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() ?? "";

  async function complete(provider: "google" | "facebook", token: string) {
    try {
      setError("");
      const result = await loginWithSocial(provider, token);
      saveAuthSession({ access: result.access, refresh: result.refresh, actorType: result.actor_type, account: result.account, source: "local" });
      router.replace(returnTo);
      router.refresh();
    } catch (reason) {
      setError(message(reason));
    }
  }

  useEffect(() => {
    if (!googleClientId) return;
    const render = () => {
      if (!window.google || !googleButton.current) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: ({ credential }) => credential && void complete("google", credential) });
      googleButton.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButton.current, { theme: "outline", size: "large", text: "continue_with", width: 400, locale: "vi" });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-edututor-google="true"]');
    if (existing) { if (window.google) render(); else existing.addEventListener("load", render, { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.edututorGoogle = "true";
    script.onload = render;
    document.head.appendChild(script);
  }, [googleClientId]);

  useEffect(() => {
    if (!facebookAppId) return;
    const initialize = () => { window.FB?.init({ appId: facebookAppId, cookie: true, xfbml: false, version: "v22.0" }); setFacebookReady(true); };
    window.fbAsyncInit = initialize;
    if (window.FB) { initialize(); return; }
    if (!document.querySelector('script[data-edututor-facebook="true"]')) {
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/vi_VN/sdk.js";
      script.async = true;
      script.dataset.edututorFacebook = "true";
      document.head.appendChild(script);
    }
  }, [facebookAppId]);

  function facebookLogin() {
    if (!window.FB) return setError("Facebook chưa sẵn sàng. Vui lòng tải lại trang.");
    window.FB.login(({ authResponse }) => {
      const token = authResponse?.accessToken;
      if (token) void complete("facebook", token);
      else setError("Bạn chưa cấp quyền đăng nhập Facebook.");
    }, { scope: "public_profile,email" });
  }

  if (!googleClientId && !facebookAppId) return null;
  return <div className="mb-7 space-y-3">
    {googleClientId && <div ref={googleButton} className="flex min-h-11 w-full justify-center overflow-hidden rounded-lg" />}
    {facebookAppId && <button type="button" disabled={!facebookReady} onClick={facebookLogin} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"><FacebookFilled className="text-lg text-blue-600" />Tiếp tục với Facebook</button>}
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
    <div className="flex items-center gap-4 text-sm text-slate-400"><span className="h-px flex-1 bg-slate-200" />hoặc<span className="h-px flex-1 bg-slate-200" /></div>
  </div>;
}
