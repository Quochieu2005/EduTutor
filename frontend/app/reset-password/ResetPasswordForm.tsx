"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { recoveryError, resetPassword } from "@/lib/password-reset-api";
import { toast } from "@/lib/toast";

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <span className="relative mt-2 block">
        <input
          type={visible ? "text" : "password"}
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-12 font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute inset-y-0 right-0 px-4 text-lg text-slate-500 hover:text-slate-800"
        >
          {visible ? "◉" : "◎"}
        </button>
      </span>
    </label>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "Liên kết đặt lại mật khẩu không hợp lệ.");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (password !== confirmation) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      toast.error("Mật khẩu xác nhận không trùng khớp.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setMessage(await resetPassword({ token, new_password: password, confirm_password: confirmation }));
      setPassword("");
      setConfirmation("");
      toast.success("Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.");
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
        <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
          Hiệu lực 5 phút
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">Tạo mật khẩu mới</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Mật khẩu cần ít nhất 8 ký tự và hai ô phải trùng nhau.</p>

        {message ? (
          <div className="mt-7">
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
            <Link href="/login" className="mt-5 block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700">
              Đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <PasswordInput label="Mật khẩu mới" value={password} onChange={setPassword} />
            <PasswordInput label="Xác nhận mật khẩu" value={confirmation} onChange={setConfirmation} />
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang cập nhật…" : "Đổi mật khẩu"}
            </button>
            <Link href="/forgot-password" className="block text-center text-sm font-semibold text-blue-600">
              Link hết hạn hoặc không nhận được email? Gửi lại liên kết
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
