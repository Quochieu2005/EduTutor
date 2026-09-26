"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CLASS_CATEGORIES,
  MOCK_ALL_CLASSES,
  type ClassListing,
} from "@/lib/home-mock-data";

function ClassesContent() {
  const searchParams = useSearchParams();
  const rawCategory = searchParams.get("category");

  const [selectedOption, setSelectedOption] = useState<"all" | "needing" | "with">("all");
  const [keyword, setKeyword] = useState("");

  // Kiểm tra tính hợp lệ của category
  const validCategory = useMemo(() => {
    if (!rawCategory) return null;
    const found = CLASS_CATEGORIES.find((c) => c.id === rawCategory.toLowerCase());
    return found ? found.id : null;
  }, [rawCategory]);

  const activeCategoryInfo = useMemo(() => {
    if (!validCategory) return null;
    return CLASS_CATEGORIES.find((c) => c.id === validCategory);
  }, [validCategory]);

  // Lọc danh sách lớp
  const filteredClasses = useMemo(() => {
    return MOCK_ALL_CLASSES.filter((cls) => {
      // 1. Lọc theo category
      if (validCategory && cls.category !== validCategory) {
        return false;
      }

      // 2. Lọc theo tùy chọn tuyển gia sư / đã có gia sư
      if (selectedOption === "needing" && cls.status !== "needing") return false;
      if (selectedOption === "with" && cls.status !== "with") return false;

      // 3. Lọc theo từ khóa tìm kiếm nhanh
      if (keyword.trim()) {
        const kw = keyword.toLowerCase().trim();
        const match =
          cls.code.toLowerCase().includes(kw) ||
          cls.title.toLowerCase().includes(kw) ||
          cls.subject.toLowerCase().includes(kw) ||
          cls.address.toLowerCase().includes(kw) ||
          (cls.tutorName && cls.tutorName.toLowerCase().includes(kw));
        if (!match) return false;
      }

      return true;
    });
  }, [validCategory, selectedOption, keyword]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Tiêu đề trang & Breadcrumbs */}
      <div>
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 mb-2">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/Home" className="hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-gray-900">Danh sách lớp học</li>
            {activeCategoryInfo && (
              <>
                <li>/</li>
                <li className="text-blue-600 font-semibold">{activeCategoryInfo.name}</li>
              </>
            )}
          </ol>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {activeCategoryInfo ? activeCategoryInfo.name : "Toàn bộ danh sách lớp học"}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {activeCategoryInfo
            ? activeCategoryInfo.description
            : "Khám phá các lớp học gia sư chất lượng cao trên cả nước, cập nhật liên tục"}
        </p>
      </div>

      {/* Thông báo nếu category query param không hợp lệ */}
      {rawCategory && !validCategory && (
        <div
          role="status"
          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
        >
          Danh mục &ldquo;{rawCategory}&rdquo; không tồn tại. Đang hiển thị toàn bộ các lớp học.
        </div>
      )}

      {/* Bộ lọc danh mục nhanh (Category Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <Link
          href="/classes"
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
            !validCategory
              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-blue-600"
          }`}
        >
          Tất cả danh mục
        </Link>
        {CLASS_CATEGORIES.map((cat) => {
          const isActive = validCategory === cat.id;
          return (
            <Link
              key={cat.id}
              href={`/classes?category=${cat.id}`}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-blue-600"
              }`}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>

      {/* Hàng điều khiển: Tìm kiếm nhanh + Tùy chọn trạng thái lớp */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tìm kiếm từ khóa */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo môn, mã lớp, khu vực..."
            className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Tùy chọn trạng thái lớp: Tất cả / Cần tuyển / Đang có gia sư */}
        <div className="inline-flex p-1 bg-gray-100 rounded-lg border border-gray-200 text-xs">
          <button
            type="button"
            onClick={() => setSelectedOption("all")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              selectedOption === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tất cả ({MOCK_ALL_CLASSES.filter((c) => !validCategory || c.category === validCategory).length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedOption("needing")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              selectedOption === "needing" ? "bg-white text-blue-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Đang cần tuyển ({MOCK_ALL_CLASSES.filter((c) => c.status === "needing" && (!validCategory || c.category === validCategory)).length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedOption("with")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              selectedOption === "with" ? "bg-white text-purple-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Đang có gia sư ({MOCK_ALL_CLASSES.filter((c) => c.status === "with" && (!validCategory || c.category === validCategory)).length})
          </button>
        </div>
      </div>

      {/* Danh sách lớp học hiển thị */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-800">Không tìm thấy lớp học nào</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Không có lớp nào phù hợp với bộ lọc hiện tại. Vui lòng chọn danh mục khác hoặc đặt lại từ khóa tìm kiếm.
          </p>
          <Link
            href="/classes"
            className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            Xem tất cả lớp
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls: ClassListing) => (
            <article
              key={cls.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header card: Mã lớp + Trạng thái */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800">
                    {cls.code}
                  </span>
                  {cls.status === "needing" ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      ● Đang tuyển
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      ✓ Đã có gia sư
                    </span>
                  )}
                </div>

                {/* Tiêu đề lớp học (Link đến trang chi tiết) */}
                <div>
                  <h2 className="font-bold text-gray-900 text-base leading-snug">
                    <Link
                      href={`/classes/${cls.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {cls.title}
                    </Link>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{cls.address}</span>
                  </p>
                </div>

                {/* Thông số lớp: Môn, khối, hình thức, thời gian */}
                <div className="bg-gray-50/70 rounded-lg p-2.5 text-xs space-y-1.5 text-gray-700 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Danh mục:</span>
                    <span className="font-medium text-gray-900">{cls.categoryName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Môn & Lớp:</span>
                    <span className="font-medium text-blue-600">{cls.subject} ({cls.grade})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lịch học:</span>
                    <span className="font-medium text-gray-800">{cls.schedule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Số buổi:</span>
                    <span className="font-medium text-gray-800">{cls.sessionsPerWeek} buổi/tuần ({cls.sessionDuration})</span>
                  </div>
                  {cls.tutorName && (
                    <div className="flex justify-between pt-1 border-t border-gray-200/60">
                      <span className="text-gray-400">Gia sư phụ trách:</span>
                      <span className="font-semibold text-purple-700">{cls.tutorName}</span>
                    </div>
                  )}
                </div>

                {/* Yêu cầu tóm tắt */}
                <p className="text-xs text-gray-600 line-clamp-2">
                  <strong className="text-gray-700">Yêu cầu: </strong>
                  {cls.requirements}
                </p>
              </div>

              {/* Footer của card: Mức lương + Link chi tiết */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase">Học phí</span>
                  <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    {cls.fee}
                  </span>
                </div>
                <Link
                  href={`/classes/${cls.id}`}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Xem chi tiết →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ClassesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12 text-center text-sm text-gray-500">Đang tải danh sách lớp học...</div>}>
        <ClassesContent />
      </Suspense>
      <Footer />
    </div>
  );
}
