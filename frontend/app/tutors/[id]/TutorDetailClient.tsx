"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Tutor, TutorOpenClass, TutorComment } from "@/lib/home-mock-data";
import {
  addEnrollmentRequest,
  getEnrollmentRequestsForUser,
  getTutorPhone,
} from "@/lib/portal-store";

interface TutorDetailClientProps {
  tutor: Tutor;
  initialOpenClasses: TutorOpenClass[];
}

export function TutorDetailClient({ tutor, initialOpenClasses }: TutorDetailClientProps) {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  // State các lớp đang mở & đặt lớp
  const [openClasses] = useState<TutorOpenClass[]>(initialOpenClasses);
  const [bookedClassIds, setBookedClassIds] = useState<string[]>([]);
  const [bookingNotification, setBookingNotification] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<TutorOpenClass | null>(null);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [enrollmentForm, setEnrollmentForm] = useState({
    studentName: "",
    gender: "male" as "male" | "female" | "other",
    age: "",
    parentPhone: "",
    studentPhone: "",
  });

  // State bình luận
  const [comments, setComments] = useState<TutorComment[]>(tutor.comments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const commentIdCounter = useRef(200);

  useEffect(() => {
    if (!user) return;
    const initialLoad = window.setTimeout(() => {
      setEnrollmentForm((current) => ({
        ...current,
        studentName: current.studentName || user.fullName || "",
      }));
      setBookedClassIds(
        getEnrollmentRequestsForUser(user.id).map((request) => request.classId),
      );
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [user]);

  const handleRevealContact = () => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    setIsPhoneVisible(true);
  };

  // Xử lý đặt lớp học
  const handleBookClass = (classId: string) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    const targetClass = openClasses.find((c) => c.id === classId);
    if (!targetClass) return;

    const availableSlots = Math.max(0, targetClass.capacity - targetClass.enrolled);
    if (availableSlots <= 0) return;

    if (bookedClassIds.includes(classId)) return;
    setSelectedClass(targetClass);
  };

  const handleEnrollmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClass) return;

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
      address: selectedClass.teachingMode === "online" ? "Học trực tuyến" : tutor.location,
      studentName: enrollmentForm.studentName.trim(),
      gender: enrollmentForm.gender,
      age: Number(enrollmentForm.age),
      parentPhone: enrollmentForm.parentPhone.trim(),
      studentPhone: enrollmentForm.studentPhone.trim(),
    });

    setBookedClassIds((prev) => [...prev, selectedClass.id]);
    setBookingNotification(
      `Yêu cầu tham gia lớp "${selectedClass.title}" đã được gửi tới Admin. Bạn có thể theo dõi trong Profile.`,
    );
    setSelectedClass(null);
    setEnrollmentForm((current) => ({
      ...current,
      age: "",
      parentPhone: "",
      studentPhone: "",
    }));

    setTimeout(() => setBookingNotification(null), 6000);
  };

  // Gửi bình luận mới
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!isSignedIn) {
      openSignIn();
      return;
    }

    const userName = user?.fullName || user?.firstName || "Bạn (Thành viên EduTutor)";
    const userInitials = (user?.firstName?.[0] || "U") + (user?.lastName?.[0] || "");
    commentIdCounter.current += 1;

    const newComment: TutorComment = {
      id: `cm-tut-temp-${commentIdCounter.current}`,
      author: userName,
      initials: userInitials.toUpperCase(),
      avatarColor: "from-blue-600 to-indigo-600",
      content: newCommentText.trim(),
      date: "Vừa xong",
      replies: [],
    };

    setComments((prev) => [newComment, ...prev]);
    setNewCommentText("");
  };

  // Trả lời bình luận
  const handleAddReply = (parentCommentId: string) => {
    if (!replyText.trim()) return;

    if (!isSignedIn) {
      openSignIn();
      return;
    }

    const userName = user?.fullName || user?.firstName || "Bạn";
    const userInitials = (user?.firstName?.[0] || "U") + (user?.lastName?.[0] || "");
    commentIdCounter.current += 1;

    const reply: TutorComment = {
      id: `rep-tut-temp-${commentIdCounter.current}`,
      author: userName,
      initials: userInitials.toUpperCase(),
      avatarColor: "from-indigo-600 to-purple-600",
      content: replyText.trim(),
      date: "Vừa xong",
    };

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === parentCommentId) {
          return {
            ...c,
            replies: [...(c.replies || []), reply],
          };
        }
        return c;
      })
    );

    setReplyText("");
    setReplyingToId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Thông báo đặt lớp thành công */}
        {bookingNotification && (
          <div
            role="alert"
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs transition-all animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                ✓
              </span>
              <span>{bookingNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setBookingNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {selectedClass && (
          <div className="fixed inset-0 z-[70] bg-gray-950/45 backdrop-blur-sm p-4 flex items-center justify-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="enrollment-form-title"
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-2xl p-6"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h2 id="enrollment-form-title" className="text-xl font-bold text-gray-900">
                    Đăng ký tham gia lớp
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedClass.subject} • {selectedClass.grade} • {tutor.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClass(null)}
                  className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"
                  aria-label="Đóng form đăng ký"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEnrollmentSubmit} className="pt-5 space-y-4">
                <div>
                  <label htmlFor="enroll-student-name" className="block text-xs font-semibold text-gray-700 mb-1">
                    Họ tên người học *
                  </label>
                  <input
                    id="enroll-student-name"
                    required
                    value={enrollmentForm.studentName}
                    onChange={(e) => setEnrollmentForm({ ...enrollmentForm, studentName: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="enroll-gender" className="block text-xs font-semibold text-gray-700 mb-1">
                      Giới tính *
                    </label>
                    <select
                      id="enroll-gender"
                      required
                      value={enrollmentForm.gender}
                      onChange={(e) => setEnrollmentForm({ ...enrollmentForm, gender: e.target.value as "male" | "female" | "other" })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="enroll-age" className="block text-xs font-semibold text-gray-700 mb-1">
                      Độ tuổi *
                    </label>
                    <input
                      id="enroll-age"
                      type="number"
                      min="3"
                      max="100"
                      required
                      value={enrollmentForm.age}
                      onChange={(e) => setEnrollmentForm({ ...enrollmentForm, age: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="enroll-parent-phone" className="block text-xs font-semibold text-gray-700 mb-1">
                      SĐT phụ huynh (bố hoặc mẹ) *
                    </label>
                    <input
                      id="enroll-parent-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      pattern="[0-9 +.-]{9,15}"
                      value={enrollmentForm.parentPhone}
                      onChange={(e) => setEnrollmentForm({ ...enrollmentForm, parentPhone: e.target.value })}
                      placeholder="Ví dụ: 0912 345 678"
                      className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="enroll-student-phone" className="block text-xs font-semibold text-gray-700 mb-1">
                      SĐT người học *
                    </label>
                    <input
                      id="enroll-student-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      pattern="[0-9 +.-]{9,15}"
                      value={enrollmentForm.studentPhone}
                      onChange={(e) => setEnrollmentForm({ ...enrollmentForm, studentPhone: e.target.value })}
                      placeholder="Ví dụ: 0988 123 456"
                      className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
                  Yêu cầu sẽ được gửi tới trang Admin thử nghiệm. Trạng thái duyệt được hiển thị trong Profile của bạn.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClass(null)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
                  >
                    Gửi yêu cầu đăng ký
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Breadcrumb điều hướng */}
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/Home" className="hover:text-blue-600 transition-colors">
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
            <li className="font-semibold text-gray-900 truncate max-w-xs">{tutor.name}</li>
          </ol>
        </nav>

        {/* 1. HỒ SƠ GIA SƯ (HERO CARD) */}
        <section aria-labelledby="tutor-profile-heading" className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar lớn */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br ${tutor.avatarColor} text-white font-bold flex items-center justify-center text-3xl sm:text-4xl shadow-md shrink-0`}
              aria-hidden="true"
            >
              {tutor.initials}
            </div>

            {/* Thông tin chính */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 id="tutor-profile-heading" className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {tutor.name}
                </h1>
                {tutor.isVerified && (
                  <span
                    title="Gia sư đã xác minh danh tính và bằng cấp"
                    className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Đã xác minh hồ sơ
                  </span>
                )}
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {tutor.tutorType === "teacher" ? "Giáo viên / Giảng viên" : "Sinh viên giỏi"}
                </span>
              </div>

              {/* Môn & khối lớp */}
              <p className="text-sm font-semibold text-blue-600">
                Chuyên môn: {tutor.subject} • Cấp độ: {tutor.grades}
              </p>

              {/* Đánh giá sao */}
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <span className="flex" aria-hidden="true">
                  {"★".repeat(Math.floor(tutor.rating))}
                  {tutor.rating % 1 !== 0 && "½"}
                </span>
                <span className="font-bold text-gray-900">{tutor.rating}</span>
                <span className="text-gray-400">({tutor.reviewCount} đánh giá từ học viên)</span>
              </div>

              {/* Liên hệ và xem lớp đang mở */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRevealContact}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <span>{isPhoneVisible ? `SĐT: ${getTutorPhone(tutor.id)}` : "Liên hệ gia sư"}</span>
                </button>
                {openClasses.length > 0 && (
                  <a
                    href="#open-classes"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
                  >
                    <span>Xem các lớp đang mở ({openClasses.length})</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Lưới thông tin chi tiết */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Khu vực / Tỉnh:</span>
              <span className="font-semibold text-gray-900 text-sm">{tutor.location}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Kinh nghiệm:</span>
              <span className="font-semibold text-gray-900 text-sm">{tutor.experience} năm</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Hình thức dạy:</span>
              <span className="font-semibold text-purple-700 text-sm">
                {tutor.teachingMode === "both"
                  ? "Online & Trực tiếp"
                  : tutor.teachingMode === "online"
                  ? "Online"
                  : "Trực tiếp"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Học phí đề xuất:</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-sm">
                {tutor.hourlyRate}
              </span>
            </div>
          </div>

          {/* Tiểu sử & giới thiệu chi tiết */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">Giới thiệu & Phương pháp giảng dạy</h2>
            <div className="p-4 rounded-xl bg-white border border-gray-100 text-sm text-gray-700 leading-relaxed space-y-2">
              <p>{tutor.fullBio || tutor.bio}</p>
            </div>
          </div>
        </section>

        {/* 2. CÁC LỚP ĐANG MỞ CỦA GIA SƯ */}
        <section id="open-classes" aria-labelledby="open-classes-heading" className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 id="open-classes-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Các lớp đang mở của gia sư</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Đăng ký trực tiếp để được xếp lịch và nhận tư vấn chi tiết từ EduTutor
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              {openClasses.length} lớp
            </span>
          </div>

          {openClasses.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-700">
                Gia sư hiện chưa mở lớp mới.
              </p>
              <p className="text-xs text-gray-500">
                Bạn có thể gửi câu hỏi bên dưới hoặc liên hệ trung tâm để được xếp lớp riêng với gia sư này.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openClasses.map((cls) => {
                const availableSlots = Math.max(0, cls.capacity - cls.enrolled);
                const isBooked = bookedClassIds.includes(cls.id);
                const isSoldOut = availableSlots === 0;

                return (
                  <article
                    key={cls.id}
                    className="p-5 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Badge môn học & Khối */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                          {cls.subject} • {cls.grade}
                        </span>

                        {/* Badge tình trạng slot */}
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

                      {/* Tiêu đề lớp */}
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">
                        {cls.title}
                      </h3>

                      {/* Lưới thông tin lớp */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Hình thức:</span>
                          <span className="font-semibold text-gray-800">
                            {cls.teachingMode === "both"
                              ? "Online & Trực tiếp"
                              : cls.teachingMode === "online"
                              ? "Online"
                              : "Offline / Trực tiếp"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Lịch học:</span>
                          <span className="font-semibold text-gray-800">{cls.schedule}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Học phí:</span>
                          <span className="font-bold text-blue-600">{cls.fee}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Sĩ số:</span>
                          <span className="font-semibold text-gray-800">
                            {cls.enrolled}/{cls.capacity} học viên
                          </span>
                        </div>
                      </div>

                      {/* Thanh tiến độ đăng ký */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-400">
                          <span>Tiến độ ghi danh:</span>
                          <span>{Math.round((cls.enrolled / cls.capacity) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isSoldOut ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(100, (cls.enrolled / cls.capacity) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Nút Đặt lớp */}
                    <div className="pt-2 border-t border-gray-100">
                      {isBooked ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <span>✓ Đã gửi yêu cầu</span>
                        </button>
                      ) : isSoldOut ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed"
                        >
                          Hết slot
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBookClass(cls.id)}
                          className="w-full py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Đặt lớp ngay</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. ĐÁNH GIÁ & RATING BREAKDOWN */}
        <section aria-labelledby="tutor-reviews-heading" className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 id="tutor-reviews-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Đánh giá từ phụ huynh & học sinh</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Nhận xét thực tế về chuyên môn và phương pháp của gia sư
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              {tutor.reviewCount} đánh giá
            </span>
          </div>

          {/* Thống kê điểm số & phân bố số sao */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-xl bg-gray-50 border border-gray-100 items-center">
            {/* Điểm trung bình */}
            <div className="text-center space-y-1 border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0">
              <div className="text-4xl font-black text-gray-900">{tutor.rating}</div>
              <div className="flex justify-center text-amber-400 text-lg" aria-hidden="true">
                {"★".repeat(Math.floor(tutor.rating))}
                {tutor.rating % 1 !== 0 && "½"}
              </div>
              <p className="text-xs text-gray-500">Dựa trên {tutor.reviewCount} lượt đánh giá</p>
            </div>

            {/* Phân bố 5 sao đến 1 sao */}
            <div className="col-span-2 space-y-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = tutor.ratingBreakdown?.[star as keyof typeof tutor.ratingBreakdown] || 0;
                const percent = tutor.reviewCount > 0 ? (count / tutor.reviewCount) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-12 text-gray-600 font-medium">{star} sao</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danh sách đánh giá */}
          {!tutor.reviews || tutor.reviews.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
              Chưa có đánh giá nào cho gia sư này.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {tutor.reviews.map((rev) => (
                <div key={rev.id} className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {rev.reviewerName[0]}
                      </div>
                      <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                        {rev.reviewerName}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">{rev.date}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    {"★".repeat(rev.rating)}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. HỎI ĐÁP & BÌNH LUẬN */}
        <section aria-labelledby="tutor-comments-heading" className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 id="tutor-comments-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Hỏi đáp & Bình luận</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Đặt câu hỏi trực tiếp cho gia sư về lịch học hoặc phương pháp giảng dạy
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
              {comments.length} bình luận
            </span>
          </div>

          {/* Form gửi bình luận mới */}
          <form onSubmit={handleAddComment} className="space-y-3">
            <div>
              <label htmlFor="tutor-new-comment" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Để lại câu hỏi hoặc thắc mắc:
              </label>
              <textarea
                id="tutor-new-comment"
                rows={3}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={
                  isSignedIn
                    ? "Nhập câu hỏi của bạn tại đây..."
                    : "Đăng nhập để đặt câu hỏi cho gia sư..."
                }
                className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-100 placeholder-gray-400"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  !newCommentText.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
                }`}
              >
                Gửi bình luận
              </button>
            </div>
          </form>

          {/* Danh sách bình luận */}
          {comments.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
              Chưa có bình luận nào. Hãy gửi câu hỏi đầu tiên cho gia sư!
            </p>
          ) : (
            <div className="space-y-4 pt-2">
              {comments.map((cm) => (
                <div key={cm.id} className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cm.avatarColor} text-white font-bold flex items-center justify-center text-xs`}
                      >
                        {cm.initials}
                      </div>
                      <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                        {cm.author}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">{cm.date}</span>
                  </div>
                  <p className="text-xs text-gray-700 pl-9 leading-relaxed">{cm.content}</p>

                  {/* Nút mở ô trả lời */}
                  <div className="pl-9 pt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(replyingToId === cm.id ? null : cm.id);
                        setReplyText("");
                      }}
                      className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
                    >
                      {replyingToId === cm.id ? "Hủy trả lời" : "Trả lời"}
                    </button>
                  </div>

                  {/* Form trả lời lồng nhau */}
                  {replyingToId === cm.id && (
                    <div className="pl-9 pt-2 space-y-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập câu trả lời của bạn..."
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-purple-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddReply(cm.id)}
                          disabled={!replyText.trim()}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            !replyText.trim()
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                          }`}
                        >
                          Gửi
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Các câu trả lời con */}
                  {cm.replies && cm.replies.length > 0 && (
                    <div className="pl-9 pt-2 space-y-2">
                      {cm.replies.map((rep) => (
                        <div key={rep.id} className="p-3 rounded-lg bg-white border border-gray-200/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-md bg-gradient-to-br ${rep.avatarColor} text-white font-bold flex items-center justify-center text-[10px]`}
                              >
                                {rep.initials}
                              </div>
                              <span className="font-semibold text-gray-900 text-xs">
                                {rep.author}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">{rep.date}</span>
                          </div>
                          <p className="text-xs text-gray-600 pl-8 leading-relaxed">
                            {rep.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
