import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ClassRequestForm } from "@/components/ClassRequestForm";

export default function CreateClassPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
          Trang chủ <span className="mx-1">/</span> <span className="font-semibold text-slate-900">Đăng lớp tìm gia sư</span>
        </nav>
        <ClassRequestForm />
      </main>
      <Footer />
    </div>
  );
}
