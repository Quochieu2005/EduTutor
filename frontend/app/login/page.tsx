"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
      router.replace("/Home");
    } catch {
      setError("Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Đăng nhập EduTutor</h1>
        <p className="mt-2 text-sm text-slate-600">Đăng nhập bằng tài khoản EduTutor của bạn.</p>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="mt-5 block text-sm font-semibold text-slate-800">Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        <label className="mt-4 block text-sm font-semibold text-slate-800">Mật khẩu</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        <button disabled={submitting} className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <p className="mt-5 text-center text-sm text-slate-600">Chưa có tài khoản? <Link href="/register" className="font-semibold text-blue-600">Đăng ký</Link></p>
      </form>
    </main>
  );
}
