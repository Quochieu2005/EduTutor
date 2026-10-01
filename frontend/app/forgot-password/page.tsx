"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { recoveryError, requestPasswordReset } from "@/lib/password-reset-api";
import { toast } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || remaining) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      setMessage(await requestPasswordReset(email));
      setRemaining(60);
      toast.success("Đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục Spam.");
    } catch (requestError) {
      setError(recoveryError(requestError));
      toast.error(recoveryError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-md sm:p-9">
        <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          ← Quay lại đăng nhập
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">Quên mật khẩu</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Nhập email tài khoản. EduTutor sẽ gửi một liên kết chỉ dùng được một lần trong 5 phút.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-slate-800">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading || remaining > 0}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang gửi…" : remaining ? `Gửi lại sau ${remaining}s` : "Gửi liên kết đặt lại mật khẩu"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">Link đã hết hạn? Gửi yêu cầu mới tại đây. Hết hạn không tự đổi mật khẩu và không tự gửi thêm email.</p>
      </section>
    </main>
  );
}
