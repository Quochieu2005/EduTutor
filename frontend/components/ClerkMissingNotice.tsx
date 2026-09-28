import Link from "next/link";

export function ClerkMissingNotice() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-amber-700">Chưa cấu hình đăng nhập</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">EduTutor đang thiếu khóa Clerk</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Thêm <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> và <code>CLERK_SECRET_KEY</code> vào
          <code> frontend/.env.local</code>, sau đó khởi động lại Next.js. Không dùng khóa giả và không commit khóa bí mật.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
          Về trang chủ
        </Link>
      </section>
    </main>
  );
}
