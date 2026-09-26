"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TutorCard } from "@/components/TutorCard";
import {
  MOCK_FEATURED_TUTORS,
  CITIES,
  SUBJECTS,
  type Tutor,
} from "@/lib/home-mock-data";

export default function TutorsListPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Tất cả môn");
  const [selectedCity, setSelectedCity] = useState("Tất cả tỉnh/thành");

  const filteredTutors = useMemo(() => {
    return MOCK_FEATURED_TUTORS.filter((tutor) => {
      // 1. Từ khóa
      if (keyword.trim()) {
        const kw = keyword.toLowerCase().trim();
        const match =
          tutor.name.toLowerCase().includes(kw) ||
          tutor.subject.toLowerCase().includes(kw) ||
          tutor.location.toLowerCase().includes(kw) ||
          tutor.bio.toLowerCase().includes(kw);
        if (!match) return false;
      }

      // 2. Môn học
      if (selectedSubject !== "Tất cả môn" && !tutor.subject.includes(selectedSubject)) {
        return false;
      }

      // 3. Tỉnh thành
      if (
        selectedCity !== "Tất cả tỉnh/thành" &&
        tutor.city !== selectedCity &&
        !tutor.location.includes(selectedCity)
      ) {
        return false;
      }

      return true;
    });
  }, [keyword, selectedSubject, selectedCity]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />

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
              <li className="font-semibold text-gray-900">Gia sư hiện có</li>
            </ol>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Danh sách gia sư hiện có
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Đội ngũ giáo viên và sinh viên giỏi chuyên môn, giàu nhiệt huyết được EduTutor xác minh
              </p>
            </div>
            <Link
              href="/tutors/register"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:from-purple-700 hover:to-indigo-700 transition-all self-start sm:self-auto"
            >
              + Đăng ký làm gia sư
            </Link>
          </div>
        </div>

        {/* Bộ lọc tối thiểu: Từ khóa + Môn học + Khu vực */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="tutor-keyword" className="block text-xs font-semibold text-gray-700 mb-1">
              Tìm theo tên / kinh nghiệm:
            </label>
            <input
              id="tutor-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên gia sư, trường..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="tutor-subject" className="block text-xs font-semibold text-gray-700 mb-1">
              Môn học:
            </label>
            <select
              id="tutor-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-hidden focus:border-blue-500"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tutor-city" className="block text-xs font-semibold text-gray-700 mb-1">
              Khu vực / Tỉnh thành:
            </label>
            <select
              id="tutor-city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-hidden focus:border-blue-500"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Danh sách gia sư dưới dạng lưới */}
        {filteredTutors.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 space-y-2">
            <p className="text-base font-semibold text-gray-800">Không tìm thấy gia sư phù hợp</p>
            <p className="text-xs text-gray-500">Vui lòng điều chỉnh lại môn học, khu vực hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTutors.map((tutor: Tutor) => (
              <div key={tutor.id} className="h-full">
                <TutorCard tutor={tutor} />
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
