"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEduUser, useEduClerk } from "@/lib/auth";

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
import {
  type Tutor,
  type TutorOpenClass,
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
import { edututorApi, type TutorQuestion, type TutorReview } from "@/lib/edututor-api";
import { toast } from "@/lib/toast";
import {
  addEnrollmentRequest,
  getEnrollmentRequestsForUser,
  getTutorPhone,
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
  const { isSignedIn, user } = useEduUser();
  const { openSignIn } = useEduClerk();

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
  const [directSuccessMessage, setDirectSuccessMessage] = useState("");
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
  const [reviews, setReviews] = useState<TutorReview[]>([]);
  const [questions, setQuestions] = useState<TutorQuestion[]>([]);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackLoadedTutorId, setFeedbackLoadedTutorId] = useState<string | null>(null);
  const [feedbackErrorTutorId, setFeedbackErrorTutorId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isSignedIn || !user || !["student", "parent"].includes(String(user.publicMetadata?.role ?? "student"))) return;
    let cancelled = false;
    edututorApi.accountProfile().then((profile) => {
      if (cancelled) return;
      const actor = profile.student ?? profile.parent ?? profile.account ?? {};
      const name = String(actor.name ?? profile.account?.display_name ?? user.fullName ?? "");
      const phone = String(actor.phone ?? "");
      setDirectForm((current) => ({ ...current, parentName: current.parentName || name, phoneNumber: current.phoneNumber || phone }));
      setEnrollmentForm((current) => ({ ...current, studentName: current.studentName || name, parentPhone: current.parentPhone || phone, studentPhone: current.studentPhone || phone }));
    }).catch(() => {
      // The form remains usable when profile loading fails.
    });
    return () => { cancelled = true; };
  }, [isSignedIn, user]);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      edututorApi.tutorReviews(tutor.id, { page_size: 100 }),
      edututorApi.tutorQuestions(tutor.id, { page_size: 100 }),
    ])
      .then(([reviewPage, questionPage]) => {
        if (!isCurrent) return;
        setReviews(reviewPage.results);
        setQuestions(questionPage.results);
        setFeedbackLoadedTutorId(tutor.id);
      })
      .catch(() => {
        if (isCurrent) {
          setFeedbackErrorTutorId(tutor.id);
          setFeedbackError("Chưa tải được đánh giá và hỏi đáp từ hệ thống.");
        }
      });
    return () => { isCurrent = false; };
  }, [tutor.id]);

  const isLoadingFeedback = feedbackLoadedTutorId !== tutor.id && feedbackErrorTutorId !== tutor.id;
  const visibleFeedbackError = feedbackErrorTutorId === tutor.id ? feedbackError : null;
  const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));
  const averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : 0;

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
      const result = await edututorApi.inviteTutor(tutor.id, {
        contact_name: directForm.parentName.trim(),
        contact_phone: directForm.phoneNumber.trim(),
        student_name: directForm.studentName.trim(),
        grade_subject: directForm.grade || `${tutor.grades} - ${tutor.subject}`,
        message: [activeActionModal === "consult" ? "Yêu cầu tư vấn trước khi mời dạy." : "", directForm.notes.trim()].filter(Boolean).join(" "),
      });

      setDirectSuccessMessage(result.message);
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

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    const content = newQuestionText.trim();
    if (!content) return;
    setIsSubmittingQuestion(true);
    try {
      const question = await edututorApi.createTutorQuestion(tutor.id, { content });
      setQuestions((current) => [question, ...current]);
      setNewQuestionText("");
      setFeedbackError(null);
      setFeedbackErrorTutorId(null);
      toast.success("Đã gửi câu hỏi cho gia sư.");
    } catch {
      setFeedbackErrorTutorId(tutor.id);
      setFeedbackError("Không thể gửi câu hỏi lúc này. Vui lòng thử lại.");
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  return (
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                  if (!isSignedIn) { openSignIn({ forceRedirectUrl: `/tutors/${tutor.id}` }); return; }
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
                  if (!isSignedIn) { openSignIn({ forceRedirectUrl: `/tutors/${tutor.id}` }); return; }
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

        {/* 3. ĐÁNH GIÁ VÀ HỎI ĐÁP THEO TỪNG GIA SƯ */}
        <section aria-labelledby="reviews-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <h2 id="reviews-heading" className="text-lg font-bold text-slate-900">Đánh giá từ phụ huynh &amp; học sinh</h2>
              <p className="mt-1 text-xs text-slate-500">Nhận xét thực tế về chất lượng giảng dạy và sự tiến bộ của học viên</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{reviews.length} đánh giá</span>
          </div>

          {isLoadingFeedback ? (
            <p className="py-8 text-center text-xs text-slate-500">Đang tải đánh giá...</p>
          ) : (
            <>
              <div className="mt-5 grid items-center gap-5 rounded-2xl border border-slate-100 bg-slate-50 p-5 md:grid-cols-[220px_1fr]">
                <div className="border-b border-slate-200 pb-4 text-center md:border-b-0 md:border-r md:pb-0">
                  <div className="text-4xl font-black text-slate-950">{averageRating}</div>
                  <div className="mt-1 text-base tracking-wide text-amber-400" aria-label={`${averageRating} trên 5 sao`}>
                    {"★".repeat(Math.floor(averageRating))}{averageRating % 1 !== 0 ? "½" : ""}{"☆".repeat(Math.max(0, 5 - Math.ceil(averageRating)))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Dựa trên {reviews.length} lượt đánh giá</p>
                </div>
                <div className="space-y-2 text-xs">
                  {ratingBreakdown.map(({ rating, count }) => {
                    const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="w-12 font-medium text-slate-600">{rating} sao</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${percentage}%` }} /></div>
                        <span className="w-5 text-right text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {reviews.length === 0 ? (
                <p className="py-7 text-center text-xs text-slate-500">Chưa có đánh giá được công khai.</p>
              ) : (
                <div className="mt-3 divide-y divide-slate-100">
                  {reviews.map((review) => {
                    const initials = review.student.trim().slice(0, 1).toUpperCase() || "H";
                    const date = review.created_at ? new Intl.DateTimeFormat("vi-VN").format(new Date(review.created_at)) : "";
                    return (
                      <article key={review.id} className="flex gap-3 py-5 text-xs">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{initials}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">{review.student}</span>
                            <span className="text-[11px] text-slate-400">{date}</span>
                          </div>
                          <div className="mt-1 text-amber-400" aria-label={`${review.rating} sao`}>{"★".repeat(review.rating)}</div>
                          {review.comment && <p className="mt-2 leading-6 text-slate-700">{review.comment}</p>}
                          {review.admin_reply && <p className="mt-2 rounded-xl bg-blue-50 p-2.5 text-blue-700">Phản hồi từ EduTutor: {review.admin_reply}</p>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="questions-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="border-b border-slate-100 pb-5">
            <h2 id="questions-heading" className="text-lg font-bold text-slate-900">Bình luận &amp; Hỏi đáp về lớp học</h2>
            <p className="mt-1 text-xs text-slate-500">Học sinh và gia sư có thể trao đổi về yêu cầu lớp tại đây</p>
          </div>
          <form onSubmit={handleAddQuestion} className="mt-5 space-y-3">
            <label htmlFor="question-input" className="block text-xs font-semibold text-slate-700">Để lại bình luận của bạn:</label>
            <textarea id="question-input" rows={3} value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder={isSignedIn ? "Nhập câu hỏi hoặc trao đổi..." : "Đăng nhập để bình luận..."} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] italic text-slate-400">* Nội dung sẽ được kiểm duyệt trước khi hiển thị công khai.</span>
              <button type="submit" disabled={isSubmittingQuestion || !newQuestionText.trim()} className="self-end rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmittingQuestion ? "Đang gửi..." : "Gửi bình luận"}</button>
            </div>
          </form>
          {visibleFeedbackError && <p className="mt-3 text-xs text-rose-600">{visibleFeedbackError}</p>}
          <div className="mt-4 divide-y divide-slate-100">
            {questions.map((question) => (
              <article key={question.id} className="py-4 text-xs">
                <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-900">{question.student}</span><span className="text-[11px] text-slate-400">{question.created_at ? new Intl.DateTimeFormat("vi-VN").format(new Date(question.created_at)) : ""}</span></div>
                <p className="mt-1 leading-6 text-slate-700">{question.content}</p>
                {question.answer && <p className="mt-2 rounded-xl bg-blue-50 p-2.5 text-blue-700">Trả lời: {question.answer}</p>}
              </article>
            ))}
            {!isLoadingFeedback && questions.length === 0 && <p className="py-6 text-center text-xs text-slate-500">Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi!</p>}
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
                      {directSuccessMessage || "EduTutor đã tiếp nhận yêu cầu, gửi thông báo tới gia sư và chuyển yêu cầu cho Admin xử lý."}
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

  );
}
