"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useClerk } from "@clerk/nextjs";

import {
  SafetyCertificateFilled,
  CheckCircleFilled,
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
  TrophyOutlined,
  PhoneOutlined,
  StarFilled,
  SendOutlined,
  CheckOutlined,
  LoadingOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  type Tutor,
  type TutorOpenClass,
  type TutorComment,
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
import {
  addEnrollmentRequest,
  getEnrollmentRequestsForUser,
  getTutorPhone,
  addTutorDirectRequest,
} from "@/lib/portal-store";

interface TutorDetailClientProps {
  tutor: Tutor;
  initialOpenClasses: TutorOpenClass[];
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

export function TutorDetailClient({ tutor, initialOpenClasses }: TutorDetailClientProps) {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  // State các lớp đang mở & đặt lớp
  const [openClasses] = useState<TutorOpenClass[]>(initialOpenClasses);
  const [bookedClassIds, setBookedClassIds] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<TutorOpenClass | null>(null);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);

  // Direct CTAs: "Cần tư vấn" & "Mời dạy"
  const [activeActionModal, setActiveActionModal] = useState<"hire" | "consult" | null>(null);
  const [directForm, setDirectForm] = useState({
    parentName: "",
    phoneNumber: "",
    studentName: "",
    grade: "",
    subject: "",
    notes: "",
  });
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);
  const [directSuccess, setDirectSuccess] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);

  // Enrollment form for open classes
  const [enrollmentForm, setEnrollmentForm] = useState({
    studentName: "",
    gender: "male" as "male" | "female" | "other",
    age: "",
    parentPhone: "",
    studentPhone: "",
  });
  const [bookingNotification, setBookingNotification] = useState<string | null>(null);

  // Comments
  const [comments, setComments] = useState<TutorComment[]>(tutor.comments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const commentIdCounter = useRef(200);

  useEffect(() => {
    if (!user) return;
    const initialLoad = window.setTimeout(() => {
      setEnrollmentForm((current) => ({
        ...current,
        studentName: current.studentName || user.fullName || "",
      }));
      setDirectForm((current) => ({
        ...current,
        parentName: current.parentName || user.fullName || "",
      }));
      setBookedClassIds(
        getEnrollmentRequestsForUser(user.id).map((request) => request.classId),
      );
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [user]);

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

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directForm.parentName.trim() || !directForm.phoneNumber.trim()) {
      setDirectError("Vui lòng điền họ tên và số điện thoại liên hệ.");
      return;
    }

    setIsSubmittingDirect(true);
    setDirectError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));

      addTutorDirectRequest({
        type: activeActionModal === "hire" ? "hire" : "consult",
        tutorId: tutor.id,
        tutorName: tutor.name,
        contactName: directForm.parentName.trim(),
        contactPhone: directForm.phoneNumber.trim(),
        studentName: directForm.studentName.trim() || undefined,
        grade: directForm.grade || tutor.grades,
        subject: directForm.subject || tutor.subject,
        notes: directForm.notes.trim() || undefined,
      });

      setDirectSuccess(true);
    } catch {
      setDirectError("Không thể gửi thông tin lúc này. Vui lòng thử lại!");
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !user) return;

    addEnrollmentRequest({
      userId: user.id,
      userEmail: user.primaryEmailAddress?.emailAddress || "",
      tutorId: tutor.id,
      tutorName: tutor.name,
      classId: selectedClass.id,
      classTitle: selectedClass.title,
      subject: selectedClass.subject,
      grade: selectedClass.grade,
      teachingMode: selectedClass.teachingMode,
      schedule: selectedClass.schedule,
      address: tutor.location,
      studentName: enrollmentForm.studentName,
      gender: enrollmentForm.gender,
      age: Number(enrollmentForm.age) || 12,
      parentPhone: enrollmentForm.parentPhone,
      studentPhone: enrollmentForm.studentPhone,
    });

    setBookedClassIds((prev) => [...prev, selectedClass.id]);
    setSelectedClass(null);
    setBookingNotification(`Đăng ký thành công lớp "${selectedClass.title}".`);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: TutorComment = {
      id: `cm-${commentIdCounter.current++}`,
      author: user?.fullName || "Khách",
      initials: (user?.fullName || "KH").slice(0, 2).toUpperCase(),
      avatarColor: "from-blue-600 to-indigo-600",
      content: newCommentText.trim(),
      date: "Vừa xong",
    };

    setComments((prev) => [newComment, ...prev]);
    setNewCommentText("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/" className="hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/tutors" className="hover:text-blue-600 transition-colors">
                Danh sách gia sư
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-slate-900">{tutor.name}</li>
          </ol>
        </nav>

        {bookingNotification && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircleFilled className="text-emerald-600" />
              <span>{bookingNotification}</span>
            </span>
            <button
              type="button"
              onClick={() => setBookingNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. HỒ SƠ CHI TIẾT GIA SƯ 2 CỘT (Ảnh 3, 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI: Thông tin cá nhân & Học vấn (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card Avatar & Tóm tắt */}
            <div className="rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-xs space-y-4">
              <div className="relative mx-auto w-28 h-28 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-md border-4 border-blue-50">
                {tutor.avatarUrl ? (
                  <Image src={tutor.avatarUrl} alt={tutor.name} fill className="object-cover" />
                ) : (
                  <span>{tutor.initials}</span>
                )}
              </div>

              <div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-bold text-xs mb-1.5">
                  {code}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {tutor.name}
                </h1>
                <p className="text-xs font-bold text-blue-600 mt-1">
                  {roleTitle} • {tutor.subject}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-amber-500 font-bold text-sm">
                <StarFilled />
                <span>{tutor.rating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal text-xs">
                  ({tutor.reviewCount} đánh giá)
                </span>
              </div>

              {/* Reveal Phone */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneVisible(!isPhoneVisible)}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneOutlined />
                  <span>{isPhoneVisible ? `Hotline: ${getTutorPhone(tutor.id)}` : "Hiển thị số liên hệ"}</span>
                </button>
              </div>
            </div>

            {/* Thông tin cá nhân */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3.5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <UserOutlined className="text-blue-600" />
                <span>Thông tin cá nhân</span>
              </h2>

              <ul className="space-y-2.5 text-xs text-slate-700">
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

            {/* Học vấn & Bằng cấp */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3.5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOutlined className="text-blue-600" />
                <span>Học vấn & Chuyên môn</span>
              </h2>

              <ul className="space-y-2.5 text-xs text-slate-700">
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

          {/* CỘT PHẢI: Chuyên môn, Lịch có thể dạy, Xác thực & CTAs (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Giới thiệu & Phương pháp */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 space-y-4 shadow-xs">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <TrophyOutlined className="text-blue-600" />
                <span>Giới thiệu & Phương pháp giảng dạy</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {tutor.fullBio || tutor.bio}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Khu vực dạy:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{tutor.location}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Hình thức:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {tutor.teachingMode === "online"
                      ? "Online"
                      : tutor.teachingMode === "offline"
                      ? "Trực tiếp"
                      : "Online & Trực tiếp"}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px]">Học phí đề xuất:</span>
                  <span className="font-bold text-blue-600 mt-0.5 block">{tutor.hourlyRate}</span>
                </div>
              </div>
            </div>

            {/* BẢNG LỊCH CÓ THỂ DẠY (Ảnh 4: Thứ 2 đến CN x Sáng, Chiều, Tối) */}
            <div className="rounded-3xl border border-blue-100 bg-white p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <CalendarOutlined className="text-blue-600" />
                  <span>Lịch có thể dạy</span>
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 inline-block" />
                    <span>Có thể dạy</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm bg-white border border-slate-300 inline-block" />
                    <span>Bận</span>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2.5 border border-slate-200 bg-slate-50 text-slate-700 font-bold">
                        Buổi
                      </th>
                      {DAYS.map((d) => (
                        <th
                          key={d.num}
                          className="p-2.5 border border-slate-200 bg-slate-50 text-slate-800 font-bold whitespace-nowrap"
                        >
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((p) => (
                      <tr key={p.key}>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50/50 text-slate-700">
                          {p.label}
                        </td>
                        {DAYS.map((d) => {
                          const isOk = availability[d.num]?.includes(p.key);
                          return (
                            <td
                              key={`${d.num}-${p.key}`}
                              className={`p-2.5 border border-slate-200 font-bold ${
                                isOk ? "bg-blue-600 text-white" : "bg-white text-slate-300"
                              }`}
                            >
                              {isOk ? <CheckOutlined /> : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Khối xác thực hồ sơ (Ảnh 3, 4) */}
            <div className="p-5 rounded-3xl bg-blue-50/80 border border-blue-200 flex items-start gap-4 shadow-2xs">
              <SafetyCertificateFilled className="text-3xl text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-blue-900">
                  Hồ sơ đã được EduTutor xác thực
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Thông tin cá nhân, hồ sơ học vấn và năng lực giảng dạy của gia sư {tutor.name} đã được đội ngũ EduTutor kiểm tra xác minh thực tế trước khi kết nối với quý phụ huynh.
                </p>
              </div>
            </div>

            {/* Các CTA cuối hồ sơ: "Cần tư vấn" & "Mời dạy" */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveActionModal("consult");
                  setDirectSuccess(false);
                  setDirectError(null);
                }}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm transition-colors cursor-pointer text-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Cần tư vấn
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveActionModal("hire");
                  setDirectSuccess(false);
                  setDirectError(null);
                }}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer text-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Mời dạy
              </button>
            </div>
          </div>
        </div>

        {/* 2. CÁC LỚP ĐANG MỞ CỦA GIA SƯ */}
        {openClasses.length > 0 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Các lớp đang mở của gia sư</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đăng ký trực tiếp để được giữ chỗ và nhận tư vấn xếp lịch học
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {openClasses.length} lớp
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openClasses.map((cls) => {
                const availableSlots = Math.max(0, cls.capacity - cls.enrolled);
                const isBooked = bookedClassIds.includes(cls.id);
                const isSoldOut = availableSlots === 0;

                return (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                          {cls.subject} • {cls.grade}
                        </span>
                        {isSoldOut ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Hết slot
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Còn {availableSlots} slot
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{cls.title}</h3>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Hình thức:</span>
                          <span className="font-semibold text-slate-800">
                            {cls.teachingMode === "online" ? "Online" : "Trực tiếp"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Lịch học:</span>
                          <span className="font-semibold text-slate-800">{cls.schedule}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Học phí:</span>
                          <span className="font-bold text-blue-600">{cls.fee}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Sĩ số:</span>
                          <span className="font-semibold text-slate-800">
                            {cls.enrolled}/{cls.capacity} học viên
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isBooked ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <CheckCircleFilled />
                          <span>Đã gửi đăng ký</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => {
                            if (!isSignedIn) {
                              openSignIn();
                              return;
                            }
                            setSelectedClass(cls);
                          }}
                          className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Đăng ký học lớp này
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. BÌNH LUẬN & ĐÁNH GIÁ */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">
            Hỏi đáp & Đánh giá từ học viên ({comments.length})
          </h2>

          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Đặt câu hỏi cho gia sư hoặc chia sẻ trải nghiệm học tập..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 resize-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              Gửi câu hỏi / đánh giá
            </button>
          </form>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            {comments.map((cm) => (
              <div key={cm.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{cm.author}</span>
                  <span className="text-[11px] text-slate-400">{cm.date}</span>
                </div>
                <p className="text-slate-700">{cm.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MODAL MỜI DẠY / CẦN TƯ VẤN (Ảnh 3, 4) */}
        {activeActionModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingDirect) {
                setActiveActionModal(null);
              }
            }}
          >
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SendOutlined className="text-blue-600" />
                  <span>
                    {activeActionModal === "hire"
                      ? `Mời gia sư ${tutor.name} giảng dạy`
                      : `Yêu cầu tư vấn về gia sư ${tutor.name}`}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
                >
                  <CloseOutlined />
                </button>
              </div>

              <div className="p-6">
                {directSuccess ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl">
                      <CheckCircleFilled />
                    </div>
                    <h4 className="text-sm font-bold text-emerald-900">Gửi thông tin thành công!</h4>
                    <p className="leading-relaxed">
                      EduTutor đã tiếp nhận yêu cầu của quý phụ huynh. Đội ngũ tư vấn sẽ liên hệ lại qua số điện thoại cung cấp trong vòng 30 phút.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveActionModal(null)}
                      className="mt-2 px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                    >
                      Đã hiểu
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleDirectSubmit} className="space-y-3.5">
                    {directError && (
                      <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        {directError}
                      </p>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Họ và tên phụ huynh: *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        value={directForm.parentName}
                        onChange={(e) => setDirectForm({ ...directForm, parentName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Số điện thoại liên hệ: *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0912 345 678"
                        value={directForm.phoneNumber}
                        onChange={(e) => setDirectForm({ ...directForm, phoneNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    {activeActionModal === "hire" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Tên học sinh:
                          </label>
                          <input
                            type="text"
                            placeholder="Bé An"
                            value={directForm.studentName}
                            onChange={(e) => setDirectForm({ ...directForm, studentName: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Lớp / Môn cần học:
                          </label>
                          <input
                            type="text"
                            placeholder={`VD: ${tutor.grades} - ${tutor.subject}`}
                            value={directForm.grade}
                            onChange={(e) => setDirectForm({ ...directForm, grade: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ghi chú / Yêu cầu cụ thể:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Mục tiêu điểm số, thời gian học mong muốn trong tuần..."
                        value={directForm.notes}
                        onChange={(e) => setDirectForm({ ...directForm, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingDirect}
                        className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-md shadow-blue-600/20"
                      >
                        {isSubmittingDirect ? (
                          <>
                            <LoadingOutlined />
                            <span>Đang gửi...</span>
                          </>
                        ) : (
                          <span>Xác nhận gửi yêu cầu</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveActionModal(null)}
                        className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL ĐĂNG KÝ LỚP MỞ */}
        {selectedClass && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedClass(null);
            }}
          >
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Đăng ký lớp: {selectedClass.title}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedClass(null)}
                  className="text-slate-400 hover:text-slate-800"
                >
                  <CloseOutlined />
                </button>
              </div>

              <form onSubmit={handleEnrollSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên học sinh:</label>
                  <input
                    type="text"
                    required
                    value={enrollmentForm.studentName}
                    onChange={(e) => setEnrollmentForm({ ...enrollmentForm, studentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại phụ huynh:</label>
                  <input
                    type="tel"
                    required
                    value={enrollmentForm.parentPhone}
                    onChange={(e) => setEnrollmentForm({ ...enrollmentForm, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClass(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Xác nhận đăng ký
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
