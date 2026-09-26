"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import type { ClassListing } from "@/lib/home-mock-data";
import { isApprovedTutor } from "@/lib/portal-store";

interface ClassListProps {
  classesNeeding: ClassListing[];
  classesWith: ClassListing[];
  onReset?: () => void;
}

interface ClassCardProps {
  cls: ClassListing;
  isApplied?: boolean;
  onApply?: (cls: ClassListing) => void;
}

// Component thẻ lớp học dùng chung, bảo đảm đồng bộ kích thước và responsive grid
function ClassCard({ cls, isApplied, onApply }: ClassCardProps) {
  const isNeeding = cls.status === "needing";

  return (
    <article
      className={`rounded-xl border border-gray-200 p-4 bg-gray-50/40 hover:bg-white transition-all flex flex-col justify-between ${
        isNeeding ? "hover:border-blue-300" : "hover:border-purple-300"
      } hover:shadow-sm`}
    >
      <div className="space-y-2.5">
        {/* Header: Mã lớp + Môn học + Lớp/Khối */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/classes/${cls.id}`}
            className={`text-xs font-bold px-2 py-0.5 rounded-md transition-colors shrink-0 ${
              isNeeding
                ? "bg-blue-100/70 text-blue-800 hover:bg-blue-200"
                : "bg-purple-100/70 text-purple-800 hover:bg-purple-200"
            }`}
          >
            {cls.code}
          </Link>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {cls.subject}
            </span>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {cls.categoryName}
            </span>
          </div>
        </div>

        {/* Tên lớp + Địa chỉ */}
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-snug">
            <Link
              href={`/classes/${cls.id}`}
              className={`transition-colors line-clamp-1 ${
                isNeeding ? "hover:text-blue-600" : "hover:text-purple-600"
              }`}
              title={cls.title}
            >
              {cls.title}
            </Link>
          </h3>
          <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
            <svg
              className="w-3.5 h-3.5 text-gray-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="truncate">{cls.address}</span>
          </p>
        </div>

        {/* Chi tiết: Thời gian, số buổi, học phí */}
        <div className="bg-white rounded-lg p-2.5 border border-gray-100 text-xs space-y-1 text-gray-700">
          <div className="flex justify-between items-center gap-2">
            <span className="text-gray-400 shrink-0">Thời gian:</span>
            <span className="font-medium text-gray-800 text-right truncate">{cls.schedule}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-gray-400 shrink-0">Số buổi:</span>
            <span className="font-medium text-gray-800 text-right truncate">
              {cls.sessionsPerWeek} buổi / tuần ({cls.sessionDuration})
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-50">
            <span className="text-gray-400">Mức học phí:</span>
            <span className="font-bold text-sm text-blue-600">{cls.fee}</span>
          </div>
        </div>

        {/* Khác biệt nghiệp vụ giữa hai loại lớp */}
        {isNeeding ? (
          <>
            {/* Yêu cầu đối với gia sư */}
            <div className="text-xs text-gray-600 line-clamp-2 min-h-[2rem]">
              <span className="font-semibold text-gray-700">Yêu cầu: </span>
              <span>{cls.requirements}</span>
            </div>

            {/* Thông tin liên hệ */}
            <div className="text-xs text-gray-500 flex items-center justify-between pt-1">
              <span className="truncate">
                Liên hệ: <strong className="text-gray-700">{cls.contact}</strong>
              </span>
              <Link
                href={`/classes/${cls.id}`}
                className="text-blue-600 hover:text-blue-800 font-semibold shrink-0 ml-2"
              >
                Chi tiết →
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Thông tin gia sư đảm nhận */}
            <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100 text-xs space-y-1 min-h-[2rem]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 shrink-0">Gia sư đảm nhận:</span>
                <span className="font-bold text-gray-900 truncate">
                  {cls.tutorName || "Đang cập nhật"}
                </span>
              </div>
              {cls.tutorBio && (
                <p className="text-[11px] text-gray-600 line-clamp-1">
                  {cls.tutorBio}
                </p>
              )}
            </div>

            {/* Thông tin liên hệ & Link Chi tiết */}
            <div className="text-xs text-gray-500 flex items-center justify-between pt-1">
              <span className="truncate">
                Liên hệ: <strong className="text-gray-700">{cls.contact}</strong>
              </span>
              <Link
                href={`/classes/${cls.id}`}
                className="text-purple-600 hover:text-purple-800 font-semibold shrink-0 ml-2"
              >
                Chi tiết →
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Hành động dưới đáy card */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        {isNeeding ? (
          <button
            type="button"
            disabled={isApplied}
            onClick={() => onApply?.(cls)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              isApplied
                ? "bg-emerald-100 text-emerald-800 cursor-default"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs active:scale-98"
            }`}
          >
            {isApplied ? (
              <>
                <svg
                  className="w-4 h-4 text-emerald-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Đã đăng ký nhận lớp</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Đăng ký nhận lớp</span>
              </>
            )}
          </button>
        ) : (
          <Link
            href={`/classes/${cls.id}`}
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs active:scale-98"
          >
            <span>Xem chi tiết</span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        )}
      </div>
    </article>
  );
}

export function ClassList({ classesNeeding, classesWith, onReset }: ClassListProps) {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<"needing" | "with">("needing");
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const handleApply = (cls: ClassListing) => {
    // Nếu chưa đăng nhập Clerk, mở luồng đăng nhập Clerk
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    if (!isApprovedTutor(user?.id)) {
      setNotification("Bạn cần đăng ký và được duyệt hồ sơ gia sư trước khi nhận lớp.");
      router.push("/tutors/register?required=take-class");
      return;
    }

    // Nếu đã đăng nhập, hiển thị trạng thái đăng ký thành công bằng mock frontend
    if (!appliedIds.includes(cls.id)) {
      setAppliedIds((prev) => [...prev, cls.id]);
      setNotification(`Bạn đã đăng ký nhận lớp ${cls.code} (${cls.subject} - ${cls.grade}) thành công!`);
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  return (
    <section
      id="classes"
      aria-label="Danh sách các lớp học"
      className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-gray-200 space-y-6 scroll-mt-24"
    >
      {/* Toast thông báo đăng ký thành công */}
      {notification && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold p-1"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header phần Lớp học gộp chung */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            <span>Danh sách lớp học</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Chọn danh mục lớp học bạn muốn xem bên dưới
          </p>
        </div>

        {/* Thanh chọn Option: Lớp đang cần tuyển gia sư HOẶC Lớp đang có gia sư */}
        <div
          role="tablist"
          aria-label="Tùy chọn danh sách lớp"
          className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedOption === "needing"}
            onClick={() => setSelectedOption("needing")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              selectedOption === "needing"
                ? "bg-white text-blue-700 shadow-xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                selectedOption === "needing" ? "bg-blue-600" : "bg-gray-400"
              }`}
            />
            <span>Lớp đang cần tuyển gia sư</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                selectedOption === "needing"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {classesNeeding.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedOption === "with"}
            onClick={() => setSelectedOption("with")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              selectedOption === "with"
                ? "bg-white text-purple-700 shadow-xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                selectedOption === "with" ? "bg-purple-600" : "bg-gray-400"
              }`}
            />
            <span>Lớp đang có gia sư</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                selectedOption === "with"
                  ? "bg-purple-50 text-purple-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {classesWith.length}
            </span>
          </button>
        </div>
      </div>

      {/* Hiển thị nội dung tương ứng theo Option đã chọn */}
      {selectedOption === "needing" ? (
        /* OPTION 1: Lớp đang cần tuyển gia sư */
        <div>
          {classesNeeding.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Không có lớp cần tuyển nào phù hợp với bộ lọc hiện tại.
              </p>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Xóa bộ lọc / Xem tất cả</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classesNeeding.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  isApplied={appliedIds.includes(cls.id)}
                  onApply={handleApply}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* OPTION 2: Lớp đang có gia sư - Đồng bộ dạng card 2 cột chuẩn responsive */
        <div>
          {classesWith.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Không có lớp học nào phù hợp với bộ lọc hiện tại.
              </p>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Xóa bộ lọc / Xem tất cả</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classesWith.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
