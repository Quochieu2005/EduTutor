"use client";

import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "@/lib/api";
import { saveAuthSession, type ActorType } from "@/lib/auth-session";
import { SocialLoginButtons } from "./SocialLoginButtons";

function authError(error: unknown) {
  const data = (error as { response?: { data?: { detail?: unknown } } })?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors;
  return errors?.[0]?.longMessage || errors?.[0]?.message || "Không thể đăng nhập. Vui lòng thử lại.";
}

export function ClerkCombinedSignIn({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login({ email: email.trim(), password, accountType: "auto" });
      const actorType = ((result as typeof result & { actor_type?: ActorType }).actor_type ?? result.user.role) as ActorType;
      const account = (result as typeof result & { account?: Record<string, unknown> }).account ?? result.user as unknown as Record<string, unknown>;
      saveAuthSession({ access: result.access, refresh: result.refresh, actorType, account, source: "local" });
      router.replace(returnTo);
      router.refresh();
    } catch (reason) {
      setError(authError(reason));
    } finally {
      setLoading(false);
    }
  }

  const input = "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300";
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-900">
    <section className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80">
      <div className="p-8 sm:p-12">
        <header className="mb-8 text-center"><h1 className="text-2xl font-bold">Đăng nhập EduTutor</h1><p className="mt-2 text-sm text-slate-500">Chào mừng bạn quay lại! Vui lòng đăng nhập để tiếp tục.</p></header>
        <SocialLoginButtons returnTo={returnTo} />
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={input} placeholder="Nhập địa chỉ email" /></label>
          <label className="block text-sm font-semibold">Mật khẩu<div className="relative"><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${input} pr-12`} placeholder="Nhập mật khẩu" /><button type="button" aria-label="Hiện hoặc ẩn mật khẩu" onClick={() => setShowPassword((value) => !value)} className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center text-slate-400">{showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}</button></div></label>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="text-right"><Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:underline">Quên mật khẩu?</Link></div>
          <button disabled={loading} className="h-12 w-full rounded-lg bg-slate-900 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-60">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        </form>
      </div>
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-600">Chưa có tài khoản? <Link href="/register" className="font-bold text-blue-600">Đăng ký</Link></footer>
    </section>
  </main>;
}
