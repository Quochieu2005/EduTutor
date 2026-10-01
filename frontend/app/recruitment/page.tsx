"use client";

import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ClassesListContent } from "@/app/classes/page";

export default function RecruitmentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <Suspense
        fallback={
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-xs text-slate-500">
            Đang tải thông báo tuyển dụng...
          </div>
        }
      >
        <ClassesListContent recruitmentMode />
      </Suspense>
      <Footer />
    </div>
  );
}
