"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  SearchOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  BookOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseOutlined,
  LoadingOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  MOCK_ALL_CLASSES,
  SUBJECTS,
  CITIES,
  type ClassListing,
} from "@/lib/home-mock-data";
import {
  addClassApplication,
  hasUserAppliedForClass,
  PORTAL_STORE_EVENT,
} from "@/lib/portal-store";

function ClassesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  // URL parameters
  const paramSubject = searchParams.get("subject") || "all";
  const paramMode = searchParams.get("mode") || "all";
  const paramCity = searchParams.get("city") || "all";
  const paramKeyword = searchParams.get("keyword") || "";

  // Local filter states
  const [filterSubject, setFilterSubject] = useState(paramSubject);
  const [filterMode, setFilterMode] = useState(paramMode);
  const [filterCity, setFilterCity] = useState(paramCity);
  const [filterKeyword, setFilterKeyword] = useState(paramKeyword);

  const [prevParams, setPrevParams] = useState({ paramSubject, paramMode, paramCity, paramKeyword });
  if (
    prevParams.paramSubject !== paramSubject ||
    prevParams.paramMode !== paramMode ||
    prevParams.paramCity !== paramCity ||
    prevParams.paramKeyword !== paramKeyword
  ) {
    setPrevParams({ paramSubject, paramMode, paramCity, paramKeyword });
    setFilterSubject(paramSubject);
    setFilterMode(paramMode);
    setFilterCity(paramCity);
    setFilterKeyword(paramKeyword);
  }

  // Apply filters via URL query
  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (filterSubject !== "all") params.set("subject", filterSubject);
    if (filterMode !== "all") params.set("mode", filterMode);
    if (filterCity !== "all") params.set("city", filterCity);
    if (filterKeyword.trim()) params.set("keyword", filterKeyword.trim());

    const qs = params.toString();
    router.push(`/classes${qs ? `?${qs}` : ""}`);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterSubject("all");
    setFilterMode("all");
    setFilterCity("all");
    setFilterKeyword("");
    router.push("/classes");
  };

  // State for apply dialog
  const [applyingClass, setApplyingClass] = useState<ClassListing | null>(null);
  const [applyNote, setApplyNote] = useState("");
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [, setApplicationStoreVersion] = useState(0);

  useEffect(() => {
    const handleStoreChange = () => setApplicationStoreVersion((v) => v + 1);
    window.addEventListener(PORTAL_STORE_EVENT, handleStoreChange);
    return () => window.removeEventListener(PORTAL_STORE_EVENT, handleStoreChange);
  }, []);

  // Filtered classes logic
  const filteredClasses = useMemo(() => {
    return MOCK_ALL_CLASSES.filter((cls) => {
      // 1. Môn học
      if (
        paramSubject !== "all" &&
        !cls.subject.toLowerCase().includes(paramSubject.toLowerCase())
      ) {
        return false;
      }

      // 2. Hình thức dạy
      if (paramMode !== "all") {
        if (cls.teachingMode !== "both" && cls.teachingMode !== paramMode) return false;
      }

      // 3. Khu vực
      if (paramCity !== "all") {
        if (!cls.city.includes(paramCity) && !cls.address.includes(paramCity)) return false;
      }

      // 4. Từ khóa (mã lớp hoặc địa chỉ)
      if (paramKeyword.trim()) {
        const kw = paramKeyword.toLowerCase().trim();
        const match =
          cls.code.toLowerCase().includes(kw) ||
          cls.address.toLowerCase().includes(kw) ||
          cls.title.toLowerCase().includes(kw) ||
          cls.subject.toLowerCase().includes(kw);
        if (!match) return false;
      }

      return true;
    });
  }, [paramSubject, paramMode, paramCity, paramKeyword]);

  // Click "Đề nghị dạy" handler
  const handleStartApply = (cls: ClassListing) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    setApplyingClass(cls);
    setApplyNote("");
    setApplyError(null);
    setApplySuccess(false);
  };

  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingClass || !user) return;

    setIsSubmittingApply(true);
    setApplyError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));

      addClassApplication({
        classId: applyingClass.id,
        classCode: applyingClass.code,
        classTitle: applyingClass.title,
        userId: user.id,
        userName: user.fullName || "Gia sư",
        userEmail: user.primaryEmailAddress?.emailAddress || "",
        userPhone: user.primaryPhoneNumber?.phoneNumber || "0912 345 678",
        note: applyNote.trim() || undefined,
      });

      setApplySuccess(true);
    } catch {
      setApplyError("Không thể gửi đề nghị dạy lúc này. Vui lòng thử lại!");
    } finally {
      setIsSubmittingApply(false);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
          </li>
          <li>/</li>
          <li className="font-semibold text-slate-900">Nhận lớp gia sư</li>
        </ol>
      </nav>

      {/* Header Banner: DANH SÁCH LỚP MỚI + Tổng kết quả */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            DANH SÁCH LỚP MỚI
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tổng cộng{" "}
            <span className="font-bold text-blue-600 text-base">{filteredClasses.length}</span> lớp
            học đang cần tuyển gia sư trên toàn quốc, cập nhật liên tục mỗi ngày.
          </p>
        </div>

        <Link
          href="/tutors/register"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <span>+ Đăng ký hồ sơ gia sư</span>
        </Link>
      </div>

      {/* Bộ lọc (Ảnh 5: Môn học, Hình thức dạy, Khu vực, Ô tìm kiếm theo mã lớp/địa chỉ, Nút Tìm kiếm & Xóa lọc) */}
      <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Môn học */}
          <div>
            <label htmlFor="filter-class-subject" className="block text-[11px] font-bold text-slate-700 mb-1">
              Môn học:
            </label>
            <select
              id="filter-class-subject"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả môn học</option>
              {SUBJECTS.filter((s) => s !== "Tất cả môn").map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Hình thức dạy */}
          <div>
            <label htmlFor="filter-class-mode" className="block text-[11px] font-bold text-slate-700 mb-1">
              Hình thức dạy:
            </label>
            <select
              id="filter-class-mode"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="online">Học Online</option>
              <option value="offline">Học trực tiếp tại nhà</option>
            </select>
          </div>

          {/* Khu vực */}
          <div>
            <label htmlFor="filter-class-city" className="block text-[11px] font-bold text-slate-700 mb-1">
              Khu vực:
            </label>
            <select
              id="filter-class-city"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả tỉnh/thành</option>
              {CITIES.filter((c) => c !== "Tất cả tỉnh/thành").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Ô tìm kiếm theo mã lớp hoặc địa chỉ */}
          <div>
            <label htmlFor="filter-class-kw" className="block text-[11px] font-bold text-slate-700 mb-1">
              Mã lớp hoặc địa chỉ:
            </label>
            <input
              id="filter-class-kw"
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="VD: lop-101, Cầu Giấy, Quận 7..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Nút Tìm kiếm & Xóa lọc */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ReloadOutlined className="text-xs" />
            <span>Xóa lọc</span>
          </button>

          <button
            type="button"
            onClick={handleApplyFilters}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <SearchOutlined />
            <span>Tìm kiếm</span>
          </button>
        </div>
      </div>

      {/* Kết quả rỗng */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-xl">
            <BookOutlined />
          </div>
          <h2 className="text-base font-bold text-slate-900">Không tìm thấy lớp học phù hợp</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Không có lớp nào thỏa mãn bộ lọc hiện tại. Vui lòng bấm &ldquo;Xóa lọc&rdquo; để xem toàn bộ danh sách lớp mới.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <ReloadOutlined />
            <span>Xem tất cả lớp mới</span>
          </button>
        </div>
      ) : (
        <>
          {/* BẢNG DESKTOP (Ảnh 5: 4 Cột - Mã lớp & Ngày đăng, Thông tin lớp học, Học phí tháng, Phí giao lớp & Đề nghị) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-4 px-5 w-44">Mã lớp & Ngày</th>
                  <th className="py-4 px-5">Thông tin lớp học</th>
                  <th className="py-4 px-5 w-44">Học phí tháng</th>
                  <th className="py-4 px-5 w-60">Phí giao lớp & Đề nghị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredClasses.map((cls) => {
                  const hasApplied = hasUserAppliedForClass(user?.id, cls.id);
                  const postedDate = cls.postedDate || "Hôm nay";
                  const contractFee = cls.contractFee || "25% - 30%";
                  const applicationsCount = cls.applicationsCount ?? 2;

                  return (
                    <tr key={cls.id} className="hover:bg-blue-50/20 transition-colors group">
                      {/* Cột 1: Mã lớp & Ngày đăng */}
                      <td className="py-5 px-5 align-top space-y-1.5">
                        <Link
                          href={`/classes/${cls.id}`}
                          className="inline-block px-2.5 py-1 rounded-md bg-blue-100/80 text-blue-800 font-extrabold text-xs hover:bg-blue-200 transition-colors"
                        >
                          {cls.code}
                        </Link>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <CalendarOutlined className="text-slate-400" />
                          <span>{postedDate}</span>
                        </p>
                        <div>
                          {cls.status === "needing" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                              ● Cần gia sư
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border text-[10px] font-semibold">
                              ✓ Đã có gia sư
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 2: Thông tin lớp học */}
                      <td className="py-5 px-5 align-top space-y-2">
                        <div>
                          <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            <Link href={`/classes/${cls.id}`}>
                              {cls.title}
                            </Link>
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {cls.subject} • {cls.grade}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                              {cls.teachingMode === "online"
                                ? "Dạy Online"
                                : cls.teachingMode === "offline"
                                ? "Dạy Trực tiếp"
                                : "Online / Trực tiếp"}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                              {cls.sessionsPerWeek} buổi/tuần ({cls.sessionDuration})
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 text-slate-600 text-[11px]">
                          <p className="flex items-start gap-1.5">
                            <EnvironmentOutlined className="text-blue-600 text-xs shrink-0 mt-0.5" />
                            <span>
                              <strong className="text-slate-800">Khu vực:</strong> {cls.address}
                            </span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <ClockCircleOutlined className="text-blue-600 text-xs shrink-0 mt-0.5" />
                            <span>
                              <strong className="text-slate-800">Lịch học:</strong> {cls.schedule}
                            </span>
                          </p>
                          <p>
                            <strong className="text-slate-800">Yêu cầu:</strong> {cls.requirements}
                          </p>
                        </div>
                      </td>

                      {/* Cột 3: Học phí tháng */}
                      <td className="py-5 px-5 align-top space-y-1">
                        <span className="text-sm font-extrabold text-blue-600 block">
                          {cls.fee}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Thanh toán cuối tháng
                        </span>
                      </td>

                      {/* Cột 4: Phí giao lớp & Nút đề nghị */}
                      <td className="py-5 px-5 align-top space-y-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                          <p className="text-slate-600">
                            Phí giao lớp: <strong className="text-slate-900">{contractFee}</strong>
                          </p>
                          <p className="text-slate-500">
                            Số người đã đề nghị:{" "}
                            <strong className="text-blue-600">{applicationsCount} người</strong>
                          </p>
                        </div>

                        <div>
                          {hasApplied ? (
                            <button
                              type="button"
                              disabled
                              className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                            >
                              <CheckCircleFilled />
                              <span>Đã gửi đề nghị</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartApply(cls)}
                              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <SendOutlined />
                              <span>Đề nghị dạy</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DANH SÁCH MOBILE (Ảnh 5: Chuyển dạng card) */}
          <div className="lg:hidden space-y-4">
            {filteredClasses.map((cls) => {
              const hasApplied = hasUserAppliedForClass(user?.id, cls.id);
              const postedDate = cls.postedDate || "Hôm nay";
              const contractFee = cls.contractFee || "25% - 30%";
              const applicationsCount = cls.applicationsCount ?? 2;

              return (
                <div
                  key={cls.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-bold text-xs">
                      {cls.code}
                    </span>
                    <span className="text-[11px] text-slate-400">{postedDate}</span>
                  </div>

                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base leading-snug">
                      <Link href={`/classes/${cls.id}`} className="hover:text-blue-600">
                        {cls.title}
                      </Link>
                    </h2>
                    <p className="text-xs font-semibold text-blue-600 mt-1">
                      Học phí: {cls.fee}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-100">
                    <p>
                      <span className="text-slate-400">Môn & Lớp:</span>{" "}
                      <span className="font-semibold text-slate-900">
                        {cls.subject} • {cls.grade}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Hình thức:</span>{" "}
                      <span className="font-semibold text-slate-900">
                        {cls.teachingMode === "online" ? "Online" : "Trực tiếp"} ({cls.sessionsPerWeek} buổi/tuần)
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Khu vực:</span>{" "}
                      <span className="font-semibold text-slate-900">{cls.address}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Lịch dự kiến:</span>{" "}
                      <span className="font-semibold text-slate-900">{cls.schedule}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Yêu cầu:</span>{" "}
                      <span className="font-semibold text-slate-900">{cls.requirements}</span>
                    </p>
                    <div className="pt-1 flex justify-between border-t border-slate-200/60 text-[11px]">
                      <span>Phí nhận: <strong>{contractFee}</strong></span>
                      <span className="text-blue-600 font-semibold">{applicationsCount} người đã đề nghị</span>
                    </div>
                  </div>

                  <div>
                    {hasApplied ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1 cursor-not-allowed"
                      >
                        <CheckCircleFilled />
                        <span>Đã gửi đề nghị dạy</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartApply(cls)}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <SendOutlined />
                        <span>Đề nghị dạy lớp này</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* DIALOG XÁC NHẬN "ĐỀ NGHỊ DẠY" */}
      {applyingClass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingApply) {
              setApplyingClass(null);
            }
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold">
                  {applyingClass.code}
                </span>
                <span className="text-xs font-bold text-slate-700">Xác nhận đề nghị nhận lớp</span>
              </div>
              <button
                type="button"
                onClick={() => setApplyingClass(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
              >
                <CloseOutlined />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {applySuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl">
                    <CheckCircleFilled />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-900">Gửi đề nghị dạy thành công!</h3>
                  <p className="leading-relaxed">
                    Yêu cầu nhận lớp của bạn đã được chuyển tới phụ huynh và ban quản lý EduTutor. Chúng tôi sẽ liên hệ trong ít phút để sắp xếp lịch giao lớp.
                  </p>
                  <button
                    type="button"
                    onClick={() => setApplyingClass(null)}
                    className="mt-2 px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfirmApply} className="space-y-4">
                  {applyError && (
                    <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      {applyError}
                    </p>
                  )}

                  {/* Summary of class */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs space-y-1.5 text-slate-700">
                    <p className="font-bold text-slate-900 text-sm">{applyingClass.title}</p>
                    <p>
                      <span className="text-slate-400">Học phí:</span>{" "}
                      <strong className="text-blue-700">{applyingClass.fee}</strong> • Phí nhận lớp:{" "}
                      <strong>{applyingClass.contractFee || "25% - 30%"}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Địa chỉ:</span> {applyingClass.address}
                    </p>
                    <p>
                      <span className="text-slate-400">Lịch học:</span> {applyingClass.schedule}
                    </p>
                  </div>

                  {/* Tutor identification */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <span className="text-slate-400 block text-[11px]">Thông tin gia sư đề nghị:</span>
                    <p className="font-bold text-slate-900">
                      {user?.fullName || "Gia sư"} ({user?.primaryEmailAddress?.emailAddress || ""})
                    </p>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Lời nhắn / Điểm mạnh của bạn cho lớp này (tùy chọn):
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Kinh nghiệm dạy lớp tương tự, thời gian có thể bắt đầu..."
                      value={applyNote}
                      onChange={(e) => setApplyNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Submit actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingApply}
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-md shadow-blue-600/20"
                    >
                      {isSubmittingApply ? (
                        <>
                          <LoadingOutlined />
                          <span>Đang gửi đề nghị...</span>
                        </>
                      ) : (
                        <span>Xác nhận gửi đề nghị dạy</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setApplyingClass(null)}
                      className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ClassesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <Suspense
        fallback={
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-xs text-slate-500">
            Đang tải danh sách lớp mới...
          </div>
        }
      >
        <ClassesListContent />
      </Suspense>
      <Footer />
    </div>
  );
}
