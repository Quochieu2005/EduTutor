"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CloseOutlined,
  CheckCircleFilled,
  SafetyCertificateFilled,
  UserOutlined,
  CalendarOutlined,
  BookOutlined,
  TrophyOutlined,
  CheckOutlined,
  LoadingOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  type Tutor,
  getTutorCode,
  getTutorRoleTitle,
  getTutorInstitution,
  getTutorMajor,
  getTutorBirthYear,
  getTutorGender,
  getTutorHometown,
  getTutorVoice,
  getTutorDegree,
  getTutorAvailability,
} from "@/lib/home-mock-data";
import { addTutorDirectRequest } from "@/lib/portal-store";

interface TutorProfileModalProps {
  tutor: Tutor | null;
  isOpen: boolean;
  onClose: () => void;
  triggerElement?: HTMLElement | null;
}

const DAYS = [
  { num: 2, label: "Thứ 2" },
  { num: 3, label: "Thứ 3" },
  { num: 4, label: "Thứ 4" },
  { num: 5, label: "Thứ 5" },
  { num: 6, label: "Thứ 6" },
  { num: 7, label: "Thứ 7" },
  { num: 8, label: "Chủ nhật" },
];

const PERIODS: { key: "morning" | "afternoon" | "evening"; label: "Sáng" | "Chiều" | "Tối" }[] = [
  { key: "morning", label: "Sáng" },
  { key: "afternoon", label: "Chiều" },
  { key: "evening", label: "Tối" },
];

export function TutorProfileModal({
  tutor,
  isOpen,
  onClose,
  triggerElement,
}: TutorProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "hire" | "consult">("profile");

  // Form states for "Cần tư vấn" & "Mời dạy"
  const [formData, setFormData] = useState({
    parentName: "",
    phoneNumber: "",
    studentName: "",
    grade: "",
    subject: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Keyboard navigation & Focus management
  useEffect(() => {
    if (!isOpen) return;

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus on close button or modal container
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      // Focus trap
      if (e.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [isOpen, onClose, triggerElement]);

  if (!isOpen || !tutor) return null;

  const code = getTutorCode(tutor);
  const roleTitle = getTutorRoleTitle(tutor);
  const institution = getTutorInstitution(tutor);
  const major = getTutorMajor(tutor);
  const birthYear = getTutorBirthYear(tutor);
  const gender = getTutorGender(tutor);
  const hometown = getTutorHometown(tutor);
  const voice = getTutorVoice(tutor);
  const degree = getTutorDegree(tutor);
  const availability = getTutorAvailability(tutor);

  const handleSubmitAction = async (e: React.FormEvent, type: "hire" | "consult") => {
    e.preventDefault();
    if (!formData.parentName.trim() || !formData.phoneNumber.trim()) {
      setFormError("Vui lòng điền họ tên và số điện thoại liên hệ.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));

      addTutorDirectRequest({
        type,
        tutorId: tutor.id,
        tutorName: tutor.name,
        contactName: formData.parentName.trim(),
        contactPhone: formData.phoneNumber.trim(),
        studentName: formData.studentName.trim() || undefined,
        grade: formData.grade || tutor.grades,
        subject: formData.subject || tutor.subject,
        notes: formData.notes.trim() || undefined,
      });

      setFormSuccess(true);
    } catch {
      setFormError("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutor-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-blue-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold tracking-wider">
              {code}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">
              Hồ sơ gia sư EduTutor
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ hồ sơ"
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center text-sm transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <CloseOutlined />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Main 2-column layout (Ảnh 3, 4) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Cột trái: Thông tin cá nhân & Học vấn (md:col-span-5) */}
            <div className="md:col-span-5 space-y-5">
              {/* Profile Card Summary */}
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-5 text-center shadow-xs space-y-3">
                <div className="relative mx-auto w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-white">
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

                <div>
                  <h2
                    id="tutor-modal-title"
                    className="text-xl font-extrabold text-slate-900"
                  >
                    {tutor.name}
                  </h2>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">
                    {roleTitle} • {tutor.subject}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-1 text-amber-500 text-xs font-bold">
                  <span>★ {tutor.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">
                    ({tutor.reviewCount} đánh giá)
                  </span>
                </div>
              </div>

              {/* Khối thông tin cá nhân */}
              <div className="rounded-2xl border border-slate-100 p-4.5 bg-white space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <UserOutlined className="text-blue-600" />
                  <span>Thông tin cá nhân</span>
                </h3>

                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Năm sinh:</span>
                    <span className="font-semibold text-slate-900">{birthYear}</span>
                  </li>
                  <li className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Giới tính:</span>
                    <span className="font-semibold text-slate-900">
                      {gender === "male" ? "Nam" : "Nữ"}
                    </span>
                  </li>
                  <li className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Quê quán:</span>
                    <span className="font-semibold text-slate-900">{hometown}</span>
                  </li>
                  <li className="flex justify-between py-1">
                    <span className="text-slate-400">Giọng nói:</span>
                    <span className="font-semibold text-slate-900">{voice}</span>
                  </li>
                </ul>
              </div>

              {/* Khối học vấn */}
              <div className="rounded-2xl border border-slate-100 p-4.5 bg-white space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BookOutlined className="text-blue-600" />
                  <span>Học vấn & Bằng cấp</span>
                </h3>

                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Cấp bậc:</span>
                    <span className="font-semibold text-blue-700">{degree}</span>
                  </li>
                  <li className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Chuyên ngành:</span>
                    <span className="font-semibold text-slate-900 text-right">{major}</span>
                  </li>
                  <li className="flex justify-between py-1">
                    <span className="text-slate-400">Trường/Nơi làm:</span>
                    <span className="font-semibold text-slate-900 text-right">{institution}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Cột phải: Chuyên môn, Lịch dạy, Xác thực & CTAs (md:col-span-7) */}
            <div className="md:col-span-7 space-y-5">
              {/* Giới thiệu & Kinh nghiệm */}
              <div className="rounded-2xl border border-slate-100 p-5 bg-white space-y-2.5 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <TrophyOutlined className="text-blue-600" />
                  <span>Chuyên môn & Kinh nghiệm</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {tutor.fullBio || tutor.bio}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Khu vực dạy:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {tutor.location}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Hình thức:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {tutor.teachingMode === "online"
                        ? "Dạy Online"
                        : tutor.teachingMode === "offline"
                        ? "Dạy Trực tiếp"
                        : "Online & Trực tiếp"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng thời gian có thể dạy (Ảnh 4 - Thứ 2 đến CN x Sáng, Chiều, Tối) */}
              <div className="rounded-2xl border border-blue-100 p-5 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <CalendarOutlined className="text-blue-600 text-sm" />
                    <span>Lịch có thể dạy</span>
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
                      <span>Có thể dạy</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-white border border-slate-200 inline-block" />
                      <span>Bận</span>
                    </span>
                  </div>
                </div>

                {/* Grid Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className="p-2 border border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          Buổi
                        </th>
                        {DAYS.map((d) => (
                          <th
                            key={d.num}
                            className="p-2 border border-slate-200 bg-slate-50 text-slate-700 font-bold whitespace-nowrap"
                          >
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIODS.map((period) => (
                        <tr key={period.key}>
                          <td className="p-2 border border-slate-200 font-bold bg-slate-50/50 text-slate-600">
                            {period.label}
                          </td>
                          {DAYS.map((d) => {
                            const isAvailable = availability[d.num]?.includes(period.key);
                            return (
                              <td
                                key={`${d.num}-${period.key}`}
                                className={`p-2 border border-slate-200 transition-colors ${
                                  isAvailable
                                    ? "bg-blue-600 text-white font-bold"
                                    : "bg-white text-slate-300"
                                }`}
                              >
                                {isAvailable ? <CheckOutlined /> : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Khối xác thực hồ sơ (Ảnh 3, 4 - EduTutor verified) */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3.5 shadow-2xs">
                <SafetyCertificateFilled className="text-2xl text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-blue-900">
                    Hồ sơ đã được EduTutor xác thực
                  </h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Thông tin cá nhân, bằng cấp chuyên môn và lý lịch của gia sư đã được đội ngũ EduTutor kiểm tra và chứng thực trước khi kết nối với phụ huynh.
                  </p>
                </div>
              </div>

              {/* Form Action Container (Mời dạy / Cần tư vấn) */}
              {activeTab === "profile" && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("consult");
                      setFormSuccess(false);
                      setFormError(null);
                    }}
                    className="w-full sm:flex-1 py-3 px-5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs transition-colors cursor-pointer text-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Cần tư vấn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("hire");
                      setFormSuccess(false);
                      setFormError(null);
                    }}
                    className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer text-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Mời dạy
                  </button>
                </div>
              )}

              {/* Form Inline View when clicking "Cần tư vấn" or "Mời dạy" */}
              {activeTab !== "profile" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <SendOutlined className="text-blue-600" />
                      <span>
                        {activeTab === "hire"
                          ? `Gửi yêu cầu mời dạy tới ${tutor.name}`
                          : `Đăng ký tư vấn về gia sư ${tutor.name}`}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setActiveTab("profile")}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      Quay lại
                    </button>
                  </div>

                  {formSuccess ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircleFilled className="text-emerald-600" />
                        <span>Gửi yêu cầu thành công!</span>
                      </p>
                      <p>
                        EduTutor đã nhận thông tin và sẽ liên hệ với bạn trong vòng 30 phút để xác nhận và sắp xếp buổi học thử.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormSuccess(false);
                          setActiveTab("profile");
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Đóng thông báo
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => handleSubmitAction(e, activeTab === "hire" ? "hire" : "consult")}
                      className="space-y-3"
                    >
                      {formError && (
                        <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                          {formError}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Họ và tên của bạn: *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Nguyễn Văn A"
                            value={formData.parentName}
                            onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Số điện thoại: *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="0912 345 678"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {activeTab === "hire" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Tên học sinh (nếu có):
                            </label>
                            <input
                              type="text"
                              placeholder="Bé An"
                              value={formData.studentName}
                              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Lớp học / Môn học cần kèm:
                            </label>
                            <input
                              type="text"
                              placeholder={`Ví dụ: ${tutor.grades} - ${tutor.subject}`}
                              value={formData.grade}
                              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Ghi chú yêu cầu học tập:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Mục tiêu học, lịch học mong muốn..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500 resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <>
                              <LoadingOutlined />
                              <span>Đang xử lý...</span>
                            </>
                          ) : (
                            <span>Xác nhận gửi thông tin</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("profile")}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
