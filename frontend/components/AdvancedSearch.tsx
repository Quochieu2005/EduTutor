"use client";

import {
  CITIES,
  SUBJECTS,
  GRADES,
  TEACHING_MODES,
  FEE_RANGES,
} from "@/lib/home-mock-data";

export interface SearchFilterState {
  keyword: string;
  subject: string;
  grade: string;
  city: string;
  mode: string;
  feeRange: string;
  tutorType?: "all" | "student" | "teacher";
}

interface AdvancedSearchProps {
  filters: SearchFilterState;
  onChange: (key: keyof SearchFilterState, value: string) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function AdvancedSearch({
  filters,
  onChange,
  onSearch,
  onReset,
}: AdvancedSearchProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section
      id="search-section"
      aria-label="Tìm kiếm gia sư và lớp học"
      className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200"
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <span>Tìm kiếm nâng cao</span>
        </h2>
        <span className="text-xs text-gray-500">
          Lọc gia sư và lớp dạy kèm phù hợp
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hàng 1: Từ khóa + Tỉnh/Thành phố */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="search-keyword" className="block text-xs font-semibold text-gray-700 mb-1">
              Từ khóa
            </label>
            <div className="relative">
              <input
                id="search-keyword"
                type="text"
                value={filters.keyword}
                onChange={(e) => onChange("keyword", e.target.value)}
                placeholder="Tên môn, giáo viên, quận/huyện..."
                className="w-full px-3.5 py-2 pl-9 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div>
            <label htmlFor="search-city" className="block text-xs font-semibold text-gray-700 mb-1">
              Tỉnh hoặc thành phố
            </label>
            <select
              id="search-city"
              value={filters.city}
              onChange={(e) => onChange("city", e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hàng 2: Môn học + Lớp/Khối */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="search-subject" className="block text-xs font-semibold text-gray-700 mb-1">
              Môn học
            </label>
            <select
              id="search-subject"
              value={filters.subject}
              onChange={(e) => onChange("subject", e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="search-grade" className="block text-xs font-semibold text-gray-700 mb-1">
              Lớp / Khối
            </label>
            <select
              id="search-grade"
              value={filters.grade}
              onChange={(e) => onChange("grade", e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {GRADES.map((gr) => (
                <option key={gr} value={gr}>
                  {gr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hàng 3: Hình thức học + Khoảng học phí / lương */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="search-mode" className="block text-xs font-semibold text-gray-700 mb-1">
              Hình thức học
            </label>
            <select
              id="search-mode"
              value={filters.mode}
              onChange={(e) => onChange("mode", e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {TEACHING_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="search-fee" className="block text-xs font-semibold text-gray-700 mb-1">
              Khoảng học phí hoặc mức lương
            </label>
            <select
              id="search-fee"
              value={filters.feeRange}
              onChange={(e) => onChange("feeRange", e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              {FEE_RANGES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nút hành động: Tìm kiếm + Đặt lại */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-300"
          >
            Đặt lại
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg shadow-sm transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-98"
          >
            Tìm kiếm
          </button>
        </div>
      </form>
    </section>
  );
}
