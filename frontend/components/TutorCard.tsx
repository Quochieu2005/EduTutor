"use client";

import Link from "next/link";
import {
  CheckCircleFilled,
  ArrowRightOutlined,
  StarFilled,
} from "@ant-design/icons";
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
      className="w-full h-full bg-white rounded-2xl border border-blue-100 p-5 hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 select-none group"
    >
      <div className="flex-1 flex flex-col">
        {/* Header của card: Avatar + Tên + Xác minh */}
        <div className="flex items-start gap-3.5">
          {/* Avatar nội bộ bằng Gradient & Initials */}
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tutor.avatarColor} text-white font-extrabold flex items-center justify-center text-base shadow-sm shrink-0`}
            aria-hidden="true"
          >
            {tutor.initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                className="font-bold text-slate-900 text-sm truncate min-w-0 group-hover:text-blue-600 transition-colors"
                title={tutor.name}
              >
                {tutor.name}
              </h3>
              {tutor.isVerified && (
                <span
                  title="Gia sư đã xác minh hồ sơ"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 border border-emerald-200"
                >
                  <CheckCircleFilled className="text-emerald-600 text-xs" />
                  <span>Đã duyệt</span>
                </span>
              )}
            </div>
            <p
              className="text-xs font-bold text-blue-600 mt-0.5 truncate"
              title={`${tutor.subject} • ${tutor.grades}`}
            >
              {tutor.subject} • {tutor.grades}
            </p>
          </div>
        </div>

        {/* Đánh giá sao bằng Ant Design Icon */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-500">
          <div className="flex items-center gap-0.5 text-xs" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarFilled
                key={i}
                className={i < Math.floor(tutor.rating) ? "text-amber-400" : "text-slate-200"}
              />
            ))}
          </div>
          <span className="font-bold text-slate-800 ml-1">{tutor.rating}</span>
          <span className="text-slate-400">({tutor.reviewCount} đánh giá)</span>
        </div>

        {/* Thông tin chi tiết */}
        <div className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs text-slate-600 items-baseline">
          <span className="text-slate-400 shrink-0">Khu vực:</span>
          <span className="font-medium text-slate-800 text-right min-w-0 break-words">
            {tutor.location}
          </span>

          <span className="text-slate-400 shrink-0">Kinh nghiệm:</span>
          <span className="font-medium text-slate-800 text-right min-w-0 break-words">
            {tutor.experience} năm
          </span>

          <span className="text-slate-400 shrink-0">Hình thức:</span>
          <span className="font-semibold text-blue-700 text-right min-w-0 break-words">
            {tutor.teachingMode === "both"
              ? "Online & Trực tiếp"
              : tutor.teachingMode === "online"
              ? "Online"
              : "Trực tiếp"}
          </span>

          <span className="text-slate-400 shrink-0">Vai trò:</span>
          <span className="font-medium text-slate-800 text-right min-w-0 break-words">
            {tutor.tutorType === "teacher" ? "Giáo viên / Giảng viên" : "Sinh viên giỏi"}
          </span>
        </div>

        {/* Bio */}
        <p className="text-xs text-slate-500 line-clamp-2 mt-2.5 leading-relaxed">
          {tutor.bio}
        </p>
      </div>

      {/* Footer Card: Học phí + Nút Xem chi tiết */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] text-slate-400 block">Học phí:</span>
          <span className="text-xs sm:text-sm font-extrabold text-blue-700 min-w-0 break-words">
            {tutor.hourlyRate}
          </span>
        </div>

        <Link
          href={`/tutors/${tutor.id}`}
          tabIndex={isClone ? -1 : 0}
          aria-hidden={isClone ? "true" : undefined}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <span>Xem chi tiết</span>
          <ArrowRightOutlined className="text-[11px]" />
        </Link>
      </div>
    </article>
  );
}
