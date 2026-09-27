"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ fullName, email, password, role: "student" });
      router.replace("/Home");
    } catch {
      setError("Không thể tạo tài khoản. Email có thể đã được sử dụng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản EduTutor</h1>
        <p className="mt-2 text-sm text-slate-600">Dùng email để đăng ký tài khoản học viên.</p>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="mt-5 block text-sm font-semibold text-slate-800">Họ và tên</label>
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={3} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        <label className="mt-4 block text-sm font-semibold text-slate-800">Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        <label className="mt-4 block text-sm font-semibold text-slate-800">Mật khẩu</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
        <button disabled={submitting} className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
          {submitting ? "Đang tạo tài khoản..." : "Đăng ký"}
        </button>
        <p className="mt-5 text-center text-sm text-slate-600">Đã có tài khoản? <Link href="/login" className="font-semibold text-blue-600">Đăng nhập</Link></p>
      </form>
    </main>
  );
}
