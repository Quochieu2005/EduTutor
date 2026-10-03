"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SearchOutlined,
  ReloadOutlined,
  StarFilled,
  EnvironmentOutlined,
  UserOutlined,
  EyeOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TutorProfileModal } from "@/components/TutorProfileModal";
import {
  type Tutor,
  getTutorCode,
  getTutorRoleTitle,
  getTutorInstitution,
  getTutorMajor,
} from "@/lib/home-mock-data";
import { edututorApi, type Province, type Ward } from "@/lib/edututor-api";
import { toTutorPresentation } from "@/lib/tutor-presenter";
import { getProvinceSlug } from "@/lib/tutor-filter-mapping";
import { toast } from "@/lib/toast";
import { getAuthSession } from "@/lib/auth-session";

function TutorsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTutorAccount = getAuthSession()?.actorType === "tutor";

  useEffect(() => {
    if (isTutorAccount) router.replace("/profile");
  }, [isTutorAccount, router]);

  // URL query params
  const paramSubject = searchParams.get("subject") || "all";
  const paramGrade = searchParams.get("grade") || "all";
  const paramMode = searchParams.get("mode") || "all";
  const paramCity = searchParams.get("city") || "all";
  const paramWard = searchParams.get("ward") || "all";
  const paramTutorId = searchParams.get("tutorId");

  // Giá trị dropdown luôn là slug do API Subjects trả về. Không ánh xạ qua
  // danh sách môn viết sẵn trong frontend, để môn Admin thêm sau này vẫn lọc được.
  const resolvedSubjectValue = paramSubject === "all" ? "all" : paramSubject;

  // Local draft filter states
  const [filterSubject, setFilterSubject] = useState(resolvedSubjectValue);
  const [filterGrade, setFilterGrade] = useState(paramGrade);
  const [filterMode, setFilterMode] = useState(paramMode);
  const [filterCity, setFilterCity] = useState(paramCity);
  const [filterWard, setFilterWard] = useState(paramWard);

  const [prevParams, setPrevParams] = useState({
    paramSubject,
    paramGrade,
    paramMode,
    paramCity,
    paramWard,
  });

  if (
    prevParams.paramSubject !== paramSubject ||
    prevParams.paramGrade !== paramGrade ||
    prevParams.paramMode !== paramMode ||
    prevParams.paramCity !== paramCity ||
    prevParams.paramWard !== paramWard
  ) {
    setPrevParams({ paramSubject, paramGrade, paramMode, paramCity, paramWard });
    setFilterSubject(resolvedSubjectValue);
    setFilterGrade(paramGrade);
    setFilterMode(paramMode);
    setFilterCity(paramCity);
    setFilterWard(paramWard);
  }

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [apiSubjects, setApiSubjects] = useState<Array<{ slug: string; name: string }>>([]);
  const [apiProvinces, setApiProvinces] = useState<Province[]>([]);
  const [apiWardsState, setApiWardsState] = useState<{ provinceSlug: string | null; wards: Ward[] }>({
    provinceSlug: null,
    wards: [],
  });
  const [referenceLoadError, setReferenceLoadError] = useState<string | null>(null);
  const [isLoadingTutors, setIsLoadingTutors] = useState(true);
  const [tutorsLoadError, setTutorsLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([edututorApi.subjects({ page_size: 100 }), edututorApi.provinces()])
      .then(([subjectPage, provinces]) => {
        if (!isCurrent) return;
        setApiSubjects(subjectPage.results.map((subject) => ({ slug: subject.slug, name: subject.name })));
        setApiProvinces(provinces);
      })
      .catch(() => {
        if (isCurrent) setReferenceLoadError("Không thể tải môn học và khu vực từ Admin.");
      });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    const provinceSlug = getProvinceSlug(paramCity);
    if (!provinceSlug) {
      return;
    }
    let isCurrent = true;
    edututorApi.wards(provinceSlug)
      .then((wards) => {
        if (isCurrent) setApiWardsState({ provinceSlug, wards });
      })
      .catch(() => {
        if (isCurrent) setApiWardsState({ provinceSlug, wards: [] });
      });
    return () => { isCurrent = false; };
  }, [paramCity]);

  const provinceSlug = getProvinceSlug(paramCity);
  const apiWards = apiWardsState.provinceSlug === provinceSlug ? apiWardsState.wards : [];

  useEffect(() => {
    let isCurrent = true;

    async function loadTutors() {
      setIsLoadingTutors(true);
      setTutorsLoadError(null);
      try {
        const page = await edututorApi.tutors({
          page_size: 100,
          subject: paramSubject === "all" ? undefined : paramSubject,
          province: getProvinceSlug(paramCity),
          ward: paramWard !== "all" ? paramWard : undefined,
          teaching_mode: paramMode === "online" || paramMode === "offline" || paramMode === "both"
            ? paramMode
            : undefined,
        });
        if (isCurrent) setTutors(page.results.map(toTutorPresentation));
      } catch {
        if (isCurrent) {
          setTutors([]);
          setTutorsLoadError("Không thể tải danh sách gia sư. Vui lòng thử lại sau.");
        }
      } finally {
        if (isCurrent) setIsLoadingTutors(false);
      }
    }

    void loadTutors();
    return () => {
      isCurrent = false;
    };
  }, [paramCity, paramMode, paramSubject, paramWard]);

  const subjectOptions = apiSubjects;
  const provinceOptions = apiProvinces.map((province) => ({ value: province.name, label: province.name }));
  const wardOptions = apiWards.map((ward) => ({ value: ward.slug, label: ward.name }));

  // Selected tutor for modal derived directly from URL.
  const selectedTutor = useMemo(() => {
    if (!paramTutorId) return null;
    return tutors.find((t) => t.id === paramTutorId) || null;
  }, [paramTutorId, tutors]);

  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);

  // Apply filters by pushing to URL query parameters
  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (filterSubject !== "all") params.set("subject", filterSubject);
    if (filterGrade !== "all") params.set("grade", filterGrade);
    if (filterMode !== "all") params.set("mode", filterMode);
    if (filterCity !== "all") params.set("city", filterCity);
    if (filterWard !== "all") params.set("ward", filterWard);

    const qs = params.toString();
    router.push(`/tutors${qs ? `?${qs}` : ""}`);
    toast.info("Đã áp dụng bộ lọc gia sư.");
  };

  // Reset filters: clear URL and reset form
  const handleResetFilters = () => {
    setFilterSubject("all");
    setFilterGrade("all");
    setFilterMode("all");
    setFilterCity("all");
    setFilterWard("all");
    router.push("/tutors");
    toast.info("Đã xóa toàn bộ bộ lọc.");
  };

  // Filter logic
  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      // 1. Môn học đã được API lọc theo subject slug. Không lọc lại bằng
      // tên hiển thị tại đây vì slug (tin-hoc-van-phong) khác chuỗi có dấu
      // hiển thị trên card (Tin Học Văn Phòng) và sẽ làm mất kết quả đúng.

      // 2. Cấp học
      if (paramGrade !== "all") {
        const requestedGrade = paramGrade as Tutor["gradeLevels"][number];
        if (!tutor.gradeLevels.includes(requestedGrade)) return false;
      }

      // 3. Hình thức dạy
      if (paramMode !== "all") {
        if (tutor.teachingMode !== "both" && tutor.teachingMode !== paramMode) return false;
      }

      // 4. Khu vực
      if (paramCity !== "all") {
        if (tutor.city !== paramCity && !tutor.location.includes(paramCity)) return false;
      }

      return true;
    });
  }, [tutors, paramGrade, paramMode, paramCity]);

  const selectedSubjectName = subjectOptions.find((subject) => subject.slug === paramSubject)?.name;
  const noResultMessage = selectedSubjectName
    ? `Hiện chưa có gia sư đang hoạt động dạy ${selectedSubjectName}. Gia sư cần được Admin duyệt môn dạy trước khi hiển thị tại đây.`
    : "Không có gia sư nào thỏa mãn đầy đủ các tiêu chí lọc hiện tại. Vui lòng bấm “Xóa lọc” để xem toàn bộ danh sách hoặc thử mở rộng khu vực.";

  const handleOpenTutor = (tutor: Tutor, e: React.MouseEvent<HTMLElement>) => {
    setTriggerEl(e.currentTarget);
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.set("tutorId", tutor.id);
    router.push(`/tutors?${currentParams.toString()}`);
  };

  const handleCloseTutor = () => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("tutorId");
    const qs = currentParams.toString();
    router.push(`/tutors${qs ? `?${qs}` : ""}`);
  };

  if (isTutorAccount) {
    return <main className="flex-1 px-4 py-16 text-center text-sm text-slate-500">Đang chuyển đến trang quản lý hồ sơ gia sư...</main>;
  }

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
          <li className="font-semibold text-slate-900">Danh sách gia sư</li>
        </ol>
      </nav>

      {/* Header Banner: Tiêu đề + Tổng số kết quả */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            DANH SÁCH GIA SƯ
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tìm thấy{" "}
            <span className="font-bold text-blue-600 text-base">{filteredTutors.length}</span> gia sư
            chất lượng cao phù hợp với điều kiện tìm kiếm của bạn.
          </p>
        </div>

        <Link
          href="/tutors/register"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <span>+ Đăng ký làm gia sư</span>
        </Link>
      </div>

      {/* Bộ lọc: dữ liệu danh mục lấy từ Admin */}
      <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Môn học */}
          <div>
            <label htmlFor="filter-subject" className="block text-[11px] font-bold text-slate-700 mb-1">
              Môn học:
            </label>
            <select
              id="filter-subject"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả môn học</option>
              {subjectOptions.length > 0 ? subjectOptions.map((sub) => (
                <option key={sub.slug} value={sub.slug}>{sub.name}</option>
              )) : <option disabled>{referenceLoadError ?? "Chưa có môn học Active trong Admin"}</option>}
            </select>
          </div>

          {/* Cấp học */}
          <div>
            <label htmlFor="filter-grade" className="block text-[11px] font-bold text-slate-700 mb-1">
              Cấp học:
            </label>
            <select
              id="filter-grade"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả cấp học</option>
              <option value="primary">Cấp 1 (Lớp 1-5)</option>
              <option value="secondary">Cấp 2 (Lớp 6-9)</option>
              <option value="high-school">Cấp 3 (Lớp 10-12)</option>
              <option value="exam-prep">Luyện thi Đại học</option>
            </select>
          </div>

          {/* Hình thức dạy */}
          <div>
            <label htmlFor="filter-mode" className="block text-[11px] font-bold text-slate-700 mb-1">
              Hình thức dạy:
            </label>
            <select
              id="filter-mode"
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
            <label htmlFor="filter-city" className="block text-[11px] font-bold text-slate-700 mb-1">
              Khu vực:
            </label>
            <select
              id="filter-city"
              value={filterCity}
              onChange={(e) => {
                setFilterCity(e.target.value);
                setFilterWard("all");
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả tỉnh/thành</option>
              {provinceOptions.length > 0 ? provinceOptions.map((province) => (
                <option key={province.value} value={province.value}>{province.label}</option>
              )) : <option disabled>{referenceLoadError ?? "Chưa có khu vực trong Admin"}</option>}
            </select>
          </div>

          {/* Xã/phường */}
          <div>
            <label htmlFor="filter-ward" className="block text-[11px] font-bold text-slate-700 mb-1">
              Xã/phường:
            </label>
            <select
              id="filter-ward"
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              disabled={filterCity === "all" || wardOptions.length === 0}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả xã/phường</option>
              {wardOptions.length > 0 ? wardOptions.map((ward) => (
                <option key={ward.value} value={ward.value}>{ward.label}</option>
              )) : <option disabled>{filterCity === "all" ? "Chọn tỉnh/thành trước" : "Chưa có xã/phường"}</option>}
            </select>
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

      {/* Kết quả rỗng (Empty State) */}
      {isLoadingTutors ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-sm text-slate-500">
          Đang tải danh sách gia sư...
        </div>
      ) : filteredTutors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-xl">
            <UserOutlined />
          </div>
          <h2 className="text-base font-bold text-slate-900">Không tìm thấy gia sư phù hợp</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {tutorsLoadError ?? noResultMessage}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <ReloadOutlined />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      ) : (
        <>
          {/* BẢNG DESKTOP (Ảnh 2: 3 Cột - Hình ảnh, Thông tin tóm tắt, Hồ sơ) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-4 px-6 w-44">Hình ảnh</th>
                  <th className="py-4 px-6 w-80">Thông tin tóm tắt</th>
                  <th className="py-4 px-6">Hồ sơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTutors.map((tutor) => {
                  const code = getTutorCode(tutor);
                  const roleTitle = getTutorRoleTitle(tutor);
                  const institution = getTutorInstitution(tutor);
                  const major = getTutorMajor(tutor);

                  return (
                    <tr
                      key={tutor.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Cột 1: Hình ảnh */}
                      <td className="py-5 px-6 align-top">
                        <div className="flex flex-col items-center gap-2 text-center w-28">
                          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-xs border border-white">
                            {tutor.avatarUrl ? (
                              <Image
                                src={tutor.avatarUrl}
                                alt={tutor.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <span>{tutor.initials}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                            <StarFilled />
                            <span>{tutor.rating.toFixed(1)}</span>
                            <span className="text-slate-400 font-normal">
                              ({tutor.reviewCount})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Thông tin tóm tắt */}
                      <td className="py-5 px-6 align-top space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800 font-bold text-[11px]">
                            {code}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                            <CheckCircleFilled className="text-xs" />
                            Đã xác thực
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {tutor.name}
                          </h3>
                          <p className="text-xs font-bold text-blue-600 mt-0.5">
                            {roleTitle}
                          </p>
                        </div>

                        <div className="space-y-1 text-slate-600 text-xs">
                          <p>
                            <span className="text-slate-400">Trường/Nơi làm:</span>{" "}
                            <span className="font-semibold text-slate-800">{institution}</span>
                          </p>
                          <p>
                            <span className="text-slate-400">Chuyên ngành:</span>{" "}
                            <span className="font-semibold text-slate-800">{major}</span>
                          </p>
                          <p>
                            <span className="text-slate-400">Kinh nghiệm:</span>{" "}
                            <span className="font-semibold text-slate-800">{tutor.experience} năm</span>
                          </p>
                        </div>
                      </td>

                      {/* Cột 3: Hồ sơ */}
                      <td className="py-5 px-6 align-top space-y-3">
                        <div className="grid grid-cols-2 gap-3 max-w-md">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-slate-400 block text-[11px]">Môn dạy:</span>
                            <span className="font-bold text-slate-900 mt-0.5 block">
                              {tutor.subject} ({tutor.grades})
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-slate-400 block text-[11px]">Hình thức:</span>
                            <span className="font-bold text-slate-900 mt-0.5 block">
                              {tutor.teachingMode === "online"
                                ? "Dạy Online"
                                : tutor.teachingMode === "offline"
                                ? "Dạy trực tiếp"
                                : "Online & Trực tiếp"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px]">Khu vực dạy:</span>
                          <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                            <EnvironmentOutlined className="text-blue-600 text-xs shrink-0" />
                            <span>{tutor.location}</span>
                          </p>
                        </div>

                        <p className="text-slate-600 line-clamp-2 italic text-[11px] leading-relaxed">
                          &ldquo;{tutor.bio}&rdquo;
                        </p>

                        <div className="pt-1 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleOpenTutor(tutor, e)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <EyeOutlined />
                            <span>Xem hồ sơ</span>
                          </button>

                          <Link
                            href={`/tutors/${tutor.id}`}
                            className="text-xs text-slate-500 hover:text-blue-600 font-semibold"
                          >
                            Mở trang riêng
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DANH SÁCH MOBILE (Ảnh 2: Chuyển dạng card, không ép bảng tràn ngang) */}
          <div className="lg:hidden space-y-4">
            {filteredTutors.map((tutor) => {
              const code = getTutorCode(tutor);
              const roleTitle = getTutorRoleTitle(tutor);
              const institution = getTutorInstitution(tutor);
              const major = getTutorMajor(tutor);

              return (
                <div
                  key={tutor.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shrink-0 border">
                      {tutor.avatarUrl ? (
                        <Image src={tutor.avatarUrl} alt={tutor.name} fill className="object-cover" />
                      ) : (
                        <span>{tutor.initials}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                          {code}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Đã xác thực
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base leading-tight truncate">
                        {tutor.name}
                      </h3>
                      <p className="text-xs font-bold text-blue-600 mt-0.5">
                        {roleTitle} • {tutor.subject}
                      </p>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs mt-1">
                        <StarFilled />
                        <span>{tutor.rating.toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">({tutor.reviewCount})</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-100">
                    <p>
                      <span className="text-slate-400">Trường/Nơi làm:</span>{" "}
                      <span className="font-semibold text-slate-900">{institution}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Chuyên ngành:</span>{" "}
                      <span className="font-semibold text-slate-900">{major}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Khu vực:</span>{" "}
                      <span className="font-semibold text-slate-900">{tutor.location}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Hình thức:</span>{" "}
                      <span className="font-semibold text-slate-900">
                        {tutor.teachingMode === "online"
                          ? "Online"
                          : tutor.teachingMode === "offline"
                          ? "Trực tiếp"
                          : "Online & Trực tiếp"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenTutor(tutor, e)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <EyeOutlined />
                      <span>Xem hồ sơ</span>
                    </button>
                    <Link
                      href={`/tutors/${tutor.id}`}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs text-center"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Profile Chi Tiết (Ảnh 3, 4) */}
      <TutorProfileModal
        tutor={selectedTutor}
        isOpen={Boolean(selectedTutor)}
        onClose={handleCloseTutor}
        triggerElement={triggerEl}
      />
    </main>
  );
}

export default function TutorsListPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <Suspense
        fallback={
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center text-xs text-slate-500">
            Đang tải danh sách gia sư...
          </div>
        }
      >
        <TutorsListContent />
      </Suspense>
      <Footer />
    </div>
  );
}
