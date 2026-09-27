"use client";

import Link from "next/link";
import type { Tutor } from "@/lib/home-mock-data";

interface TutorCardProps {
  tutor: Tutor;
  isClone?: boolean;
}

export function TutorCard({ tutor, isClone = false }: TutorCardProps) {
  return (
    <article
      tabIndex={isClone ? -1 : 0}
      aria-hidden={isClone ? "true" : undefined}
      className="w-full h-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between focus:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-400 select-none"
    >
      <div className="flex-1 flex flex-col">
        {/* Header của card: Avatar + Tên + Xác minh */}
        <div className="flex items-start gap-3">
          {/* Avatar nội bộ bằng Gradient & Initials */}
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tutor.avatarColor} text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0`}
            aria-hidden="true"
          >
            {tutor.initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm truncate min-w-0" title={tutor.name}>
                {tutor.name}
              </h3>
              {tutor.isVerified && (
                <span
                  title="Gia sư đã xác minh hồ sơ"
                  className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0"
                >
                  <svg className="w-3 h-3 text-emerald-600 mr-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Đã xác minh
                </span>
              )}
            </div>
            <p
              className="text-xs font-semibold text-blue-600 mt-0.5 truncate"
              title={`${tutor.subject} • ${tutor.grades}`}
            >
              {tutor.subject} • {tutor.grades}
            </p>
          </div>
        </div>

        {/* Đánh giá sao */}
        <div className="flex items-center gap-1 mt-2.5 text-xs text-amber-500">
          <span className="flex" aria-hidden="true">
            {"★".repeat(Math.floor(tutor.rating))}
            {tutor.rating % 1 !== 0 && "½"}
          </span>
          <span className="font-bold text-gray-800 ml-1">{tutor.rating}</span>
          <span className="text-gray-400">({tutor.reviewCount} đánh giá)</span>
        </div>

        {/* Bố cục grid hai cột ổn định cho thông tin */}
        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs text-gray-600 items-baseline">
          <span className="text-gray-400 shrink-0">Khu vực:</span>
          <span className="font-medium text-gray-800 text-right min-w-0 break-words">
            {tutor.location}
          </span>

          <span className="text-gray-400 shrink-0">Kinh nghiệm:</span>
          <span className="font-medium text-gray-800 text-right min-w-0 break-words">
            {tutor.experience} năm
          </span>

          <span className="text-gray-400 shrink-0">Hình thức:</span>
          <span className="font-medium text-purple-700 text-right min-w-0 break-words">
            {tutor.teachingMode === "both"
              ? "Online & Trực tiếp"
              : tutor.teachingMode === "online"
              ? "Online"
              : "Trực tiếp"}
          </span>

          <span className="text-gray-400 shrink-0">Vai trò:</span>
          <span className="font-medium text-gray-800 text-right min-w-0 break-words">
            {tutor.tutorType === "teacher" ? "Giáo viên / Giảng viên" : "Sinh viên giỏi"}
          </span>
        </div>

        {/* Bio với line-clamp */}
        <p className="text-[11px] text-gray-500 line-clamp-2 mt-2 leading-relaxed">
          {tutor.bio}
        </p>
      </div>

      {/* Footer: Học phí + Nút Xem chi tiết */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
          <span className="text-[11px] text-gray-400 shrink-0">Học phí:</span>
          <span className="text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 min-w-0 break-words">
            {tutor.hourlyRate}
          </span>
        </div>

        <Link
          href={`/tutors/${tutor.id}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          tabIndex={isClone ? -1 : 0}
          aria-hidden={isClone ? "true" : undefined}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <span>Xem chi tiết</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
