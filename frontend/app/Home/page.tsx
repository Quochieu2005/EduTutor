"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { AdvancedSearch, type SearchFilterState } from "@/components/AdvancedSearch";
import { FeaturedTutors } from "@/components/FeaturedTutors";
import { ClassList } from "@/components/ClassList";
import { TutorCard } from "@/components/TutorCard";
import {
  MOCK_FEATURED_TUTORS,
  MOCK_ALL_CLASSES,
  type GradeLevelSlug,
  type Tutor,
} from "@/lib/home-mock-data";

const INITIAL_FILTERS: SearchFilterState = {
  keyword: "",
  subject: "Tất cả môn",
  grade: "Tất cả khối lớp",
  city: "Tất cả tỉnh/thành",
  mode: "all",
  feeRange: "all",
  tutorType: "all",
};

// Chuẩn hóa chuỗi để so sánh chính xác
function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

// Hàm ánh xạ nhãn khối lớp từ form sang slug GradeLevelSlug chuẩn
function mapGradeFilterToLevel(gradeLabel: string): GradeLevelSlug | null {
  if (gradeLabel.includes("Cấp 1") || gradeLabel.includes("Lớp 1-5")) return "primary";
  if (gradeLabel.includes("Cấp 2") || gradeLabel.includes("Lớp 6-9")) return "secondary";
  if (gradeLabel.includes("Cấp 3") || gradeLabel.includes("Lớp 10-12")) return "high-school";
  if (gradeLabel.includes("Đại học") || gradeLabel.includes("Luyện thi")) return "exam-prep";
  return null;
}

export default function HomePage() {
  // 1. searchDraft: dữ liệu người dùng đang nhập trong form AdvancedSearch
  const [searchDraft, setSearchDraft] = useState<SearchFilterState>(INITIAL_FILTERS);

  // 2. appliedSearchFilters: dữ liệu được áp dụng sau khi người dùng bấm "Tìm kiếm"
  const [appliedSearchFilters, setAppliedSearchFilters] = useState<SearchFilterState>(INITIAL_FILTERS);

  // 3. viewMode: "home" (mặc định) | "search-results" (khi bấm Tìm kiếm trong form)
  const [viewMode, setViewMode] = useState<"home" | "search-results">("home");

  // Xử lý thay đổi draft trong form tìm kiếm
  const handleFilterChange = (key: keyof SearchFilterState, value: string) => {
    setSearchDraft((prev) => ({ ...prev, [key]: value }));
  };

  // Người dùng bấm "Tìm kiếm" trong AdvancedSearch
  const handleSearch = () => {
    setAppliedSearchFilters({ ...searchDraft });
    setViewMode("search-results");

    const el = document.getElementById("results-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Người dùng bấm "Đặt lại" trong form
  const handleReset = () => {
    setSearchDraft(INITIAL_FILTERS);
    setAppliedSearchFilters(INITIAL_FILTERS);
    setViewMode("home");
  };

  // Lọc danh sách gia sư khi tìm kiếm nâng cao
  const searchTutors = useMemo(() => {
    if (viewMode !== "search-results") return [];

    return MOCK_FEATURED_TUTORS.filter((tutor) => {
      // 1. Lọc từ khóa
      if (appliedSearchFilters.keyword.trim()) {
        const kw = normalizeString(appliedSearchFilters.keyword);
        const match =
          normalizeString(tutor.name).includes(kw) ||
          normalizeString(tutor.subject).includes(kw) ||
          normalizeString(tutor.location).includes(kw) ||
          normalizeString(tutor.city).includes(kw) ||
          normalizeString(tutor.bio).includes(kw);
        if (!match) return false;
      }

      // 2. Lọc tỉnh thành
      if (appliedSearchFilters.city !== "Tất cả tỉnh/thành") {
        const targetCity = normalizeString(appliedSearchFilters.city);
        const tutorCity = normalizeString(tutor.city || tutor.location);
        if (tutorCity !== targetCity && !tutorCity.includes(targetCity)) {
          return false;
        }
      }

      // 3. Lọc môn học
      if (
        appliedSearchFilters.subject !== "Tất cả môn" &&
        !normalizeString(tutor.subject).includes(normalizeString(appliedSearchFilters.subject))
      ) {
        return false;
      }

      // 4. Lọc Lớp / Khối
      if (appliedSearchFilters.grade !== "Tất cả khối lớp") {
        const targetLevel = mapGradeFilterToLevel(appliedSearchFilters.grade);
        if (targetLevel) {
          const hasLevel =
            (tutor.gradeLevels && tutor.gradeLevels.includes(targetLevel)) ||
            tutor.gradeLevel === targetLevel;
          if (!hasLevel) return false;
        }
      }

      // 5. Lọc loại gia sư
      if (appliedSearchFilters.tutorType && appliedSearchFilters.tutorType !== "all") {
        if (tutor.tutorType !== appliedSearchFilters.tutorType) {
          return false;
        }
      }

      // 6. Lọc hình thức học
      if (appliedSearchFilters.mode !== "all") {
        if (tutor.teachingMode !== "both" && tutor.teachingMode !== appliedSearchFilters.mode) {
          return false;
        }
      }

      // 7. Lọc mức học phí
      if (appliedSearchFilters.feeRange !== "all") {
        const rate = tutor.hourlyRateValue;
        if (appliedSearchFilters.feeRange === "under-150" && rate >= 150000) return false;
        if (appliedSearchFilters.feeRange === "150-250" && (rate < 150000 || rate > 250000)) return false;
        if (appliedSearchFilters.feeRange === "250-400" && (rate < 250000 || rate > 400000)) return false;
        if (appliedSearchFilters.feeRange === "above-400" && rate <= 400000) return false;
      }

      return true;
    });
  }, [appliedSearchFilters, viewMode]);

  // Lọc lớp cần tuyển gia sư
  const filteredClassesNeeding = useMemo(() => {
    const filters = viewMode === "search-results" ? appliedSearchFilters : INITIAL_FILTERS;

    return MOCK_ALL_CLASSES.filter((cls) => {
      if (cls.status !== "needing") return false;

      if (filters.keyword.trim()) {
        const kw = normalizeString(filters.keyword);
        const match =
          normalizeString(cls.code).includes(kw) ||
          normalizeString(cls.title).includes(kw) ||
          normalizeString(cls.subject).includes(kw) ||
          normalizeString(cls.grade).includes(kw) ||
          normalizeString(cls.address).includes(kw) ||
          normalizeString(cls.requirements).includes(kw);
        if (!match) return false;
      }

      if (filters.city !== "Tất cả tỉnh/thành") {
        const targetCity = normalizeString(filters.city);
        const clsCity = normalizeString(cls.city || cls.address);
        if (!clsCity.includes(targetCity)) return false;
      }

      if (
        filters.subject !== "Tất cả môn" &&
        !normalizeString(cls.subject).includes(normalizeString(filters.subject))
      ) {
        return false;
      }

      if (filters.grade !== "Tất cả khối lớp") {
        const targetLevel = mapGradeFilterToLevel(filters.grade);
        if (targetLevel && cls.gradeLevel !== targetLevel) return false;
      }

      if (filters.mode !== "all") {
        if (cls.teachingMode !== "both" && cls.teachingMode !== filters.mode) return false;
      }

      if (filters.feeRange !== "all") {
        const fee = cls.feeValue;
        if (filters.feeRange === "under-150" && fee >= 150000) return false;
        if (filters.feeRange === "150-250" && (fee < 150000 || fee > 250000)) return false;
        if (filters.feeRange === "250-400" && (fee < 250000 || fee > 400000)) return false;
        if (filters.feeRange === "above-400" && fee <= 400000) return false;
      }

      return true;
    });
  }, [appliedSearchFilters, viewMode]);

  // Lọc lớp đang có gia sư
  const filteredClassesWith = useMemo(() => {
    const filters = viewMode === "search-results" ? appliedSearchFilters : INITIAL_FILTERS;

    return MOCK_ALL_CLASSES.filter((cls) => {
      if (cls.status !== "with") return false;

      if (filters.keyword.trim()) {
        const kw = normalizeString(filters.keyword);
        const match =
          normalizeString(cls.code).includes(kw) ||
          normalizeString(cls.title).includes(kw) ||
          (cls.tutorName && normalizeString(cls.tutorName).includes(kw)) ||
          normalizeString(cls.subject).includes(kw) ||
          normalizeString(cls.address).includes(kw);
        if (!match) return false;
      }

      if (filters.city !== "Tất cả tỉnh/thành") {
        const targetCity = normalizeString(filters.city);
        const clsCity = normalizeString(cls.city || cls.address);
        if (!clsCity.includes(targetCity)) return false;
      }

      if (
        filters.subject !== "Tất cả môn" &&
        !normalizeString(cls.subject).includes(normalizeString(filters.subject))
      ) {
        return false;
      }

      if (filters.grade !== "Tất cả khối lớp") {
        const targetLevel = mapGradeFilterToLevel(filters.grade);
        if (targetLevel && cls.gradeLevel !== targetLevel) return false;
      }

      return true;
    });
  }, [appliedSearchFilters, viewMode]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Header */}
      <Header />

      {/* Main 3-column layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Cột 1: Sidebar trái (Điều hướng URL thật sang /tutors/results/[filterKey]) */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0">
            <LeftSidebar />
          </div>

          {/* Cột 2: Nội dung chính ở giữa */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Tìm kiếm nâng cao: chỉ thay đổi khi người dùng nhập hoặc ấn Tìm kiếm */}
            <AdvancedSearch
              filters={searchDraft}
              onChange={handleFilterChange}
              onSearch={handleSearch}
              onReset={handleReset}
            />

            {/* CHẾ ĐỘ 1: VIEWMODE === "search-results" (Kết quả sau khi bấm "Tìm kiếm" trong form) */}
            {viewMode === "search-results" && (
              <div id="results-section" className="space-y-6 scroll-mt-24">
                <section
                  aria-label="Kết quả tìm kiếm gia sư"
                  className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </span>
                        <h2 className="text-lg font-bold text-gray-900">
                          Kết quả tìm kiếm gia sư
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Tìm thấy <span className="font-semibold text-indigo-600">{searchTutors.length}</span> gia sư theo bộ lọc của bạn
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Đặt lại bộ lọc / Về trang chủ</span>
                    </button>
                  </div>

                  {searchTutors.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <p className="text-sm font-semibold text-gray-800">
                        Không tìm thấy gia sư nào phù hợp với bộ lọc hiện tại.
                      </p>
                      <p className="text-xs text-gray-500">
                        Thử điều chỉnh lại môn học, khu vực hoặc mức học phí trong form bên trên.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                      {searchTutors.map((tutor: Tutor) => (
                        <div key={tutor.id} className="h-full">
                          <TutorCard tutor={tutor} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Danh sách lớp học theo kết quả tìm kiếm */}
                <ClassList
                  classesNeeding={filteredClassesNeeding}
                  classesWith={filteredClassesWith}
                  onReset={handleReset}
                />
              </div>
            )}

            {/* CHẾ ĐỘ 2: VIEWMODE === "home" (Trang chủ mặc định: FeaturedTutors Carousel + ClassList) */}
            {viewMode === "home" && (
              <>
                {/* Gia sư tiêu biểu với carousel vô hạn giữ mỗi card 2 giây */}
                <FeaturedTutors
                  tutors={MOCK_FEATURED_TUTORS}
                  onReset={handleReset}
                />

                {/* Danh sách lớp học */}
                <ClassList
                  classesNeeding={filteredClassesNeeding}
                  classesWith={filteredClassesWith}
                  onReset={handleReset}
                />
              </>
            )}
          </div>

          {/* Cột 3: Sidebar phải */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0">
            <RightSidebar />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
