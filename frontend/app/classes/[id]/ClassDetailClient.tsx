"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { ClassListing, ClassComment } from "@/lib/home-mock-data";
import {
  isApprovedTutor,
  addEnrollmentRequest,
  getEnrollmentRequests,
  getTutorPhoneForClass,
  PORTAL_STORE_EVENT,
  type EnrollmentRequest,
} from "@/lib/portal-store";

interface ClassDetailClientProps {
  initialClass: ClassListing;
}

export function ClassDetailClient({ initialClass }: ClassDetailClientProps) {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();

  const [classItem] = useState<ClassListing>(initialClass);
  const [isApplied, setIsApplied] = useState(false);
  const [applyNotification, setApplyNotification] = useState<string | null>(null);

  // State các yêu cầu ghi danh từ portal-store
  const [enrollments, setEnrollments] = useState<EnrollmentRequest[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [enrollNotification, setEnrollNotification] = useState<string | null>(null);

  // Form đăng ký tham gia lớp
  const [enrollForm, setEnrollForm] = useState({
    studentName: "",
    gender: "male" as "male" | "female" | "other",
    age: "",
    parentPhone: "",
    studentPhone: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // State bình luận
  const [comments, setComments] = useState<ClassComment[]>(initialClass.comments);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const commentIdCounter = useRef(100);

  // Đồng bộ enrollments từ portal store theo thời gian thực
  const refreshEnrollments = useCallback(() => {
    setEnrollments(getEnrollmentRequests());
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(refreshEnrollments, 0);
    window.addEventListener(PORTAL_STORE_EVENT, refreshEnrollments);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(PORTAL_STORE_EVENT, refreshEnrollments);
    };
  }, [refreshEnrollments]);

  // Tự động điền tên người học từ tài khoản đăng nhập
  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      setEnrollForm((prev) => ({
        ...prev,
        studentName: prev.studentName || user.fullName || user.firstName || "",
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  // Xử lý query param sau khi người dùng vừa đăng nhập quay lại trang
  useEffect(() => {
    if (typeof window === "undefined" || !isSignedIn) return;
    const timer = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const action = searchParams.get("action");
      if (action === "contact") {
        setIsPhoneVisible(true);
        setIsContactModalOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      } else if (action === "enroll") {
        setIsEnrollModalOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isSignedIn]);

  // Tính toán số lượng slot và trạng thái lớp
  const tutorPhone = getTutorPhoneForClass(classItem);

  const approvedCount = enrollments.filter(
    (r) =>
      (r.classId.toLowerCase() === classItem.id.toLowerCase() ||
        r.classId.toLowerCase() === classItem.code.toLowerCase()) &&
      r.status === "approved",
  ).length;

  const capacity = classItem.capacity ?? 5;
  const baseEnrolled = classItem.enrolled ?? 0;
  const totalEnrolled = baseEnrolled + approvedCount;
  const availableSlots = Math.max(0, capacity - totalEnrolled);
  const isSoldOut = availableSlots <= 0;
  const classStatus = classItem.classStatus ?? "open"; // "open" | "paused" | "ended"

  // Kiểm tra tài khoản hiện tại đã gửi yêu cầu cho lớp này chưa
  const userEnrollment = user
    ? enrollments.find(
        (r) =>
          r.userId === user.id &&
          (r.classId.toLowerCase() === classItem.id.toLowerCase() ||
            r.classId.toLowerCase() === classItem.code.toLowerCase()),
      )
    : null;
  const isBooked = !!userEnrollment;

  // Luồng gia sư nhận lớp (dành cho lớp needing)
  const handleApply = () => {
    if (!isSignedIn) {
      openSignIn({
        fallbackRedirectUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
      return;
    }
    if (!isApprovedTutor(user?.id)) {
      setApplyNotification("Bạn cần đăng ký và được Admin duyệt hồ sơ gia sư trước khi nhận lớp.");
      router.push("/tutors/register?required=take-class");
      return;
    }
    setIsApplied(true);
    setApplyNotification(`Bạn đã đăng ký nhận lớp ${classItem.code} thành công! Trung tâm EduTutor sẽ sớm liên hệ xác nhận hồ sơ của bạn.`);
    setTimeout(() => setApplyNotification(null), 6000);
  };

  // Luồng liên hệ gia sư (chỉ dành cho học viên / phụ huynh, không yêu cầu làm gia sư)
  const handleContactTutor = () => {
    if (!isSignedIn) {
      const returnUrl = typeof window !== "undefined" ? `${window.location.pathname}?action=contact` : "";
      openSignIn({ fallbackRedirectUrl: returnUrl, forceRedirectUrl: returnUrl });
      return;
    }
    setIsPhoneVisible(true);
    setIsContactModalOpen(true);
  };

  // Luồng mở form đăng ký tham gia lớp
  const handleOpenEnrollModal = () => {
    if (!isSignedIn) {
      const returnUrl = typeof window !== "undefined" ? `${window.location.pathname}?action=enroll` : "";
      openSignIn({ fallbackRedirectUrl: returnUrl, forceRedirectUrl: returnUrl });
      return;
    }
    if (classStatus !== "open" || isSoldOut || isBooked) return;
    setFieldErrors({});
    setIsEnrollModalOpen(true);
  };

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(tutorPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Kiểm tra dữ liệu form đăng ký
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!enrollForm.studentName.trim()) {
      errors.studentName = "Vui lòng nhập họ và tên người học";
    } else if (enrollForm.studentName.trim().length < 2) {
      errors.studentName = "Họ và tên người học phải có ít nhất 2 ký tự";
    }

    const ageNum = parseInt(enrollForm.age, 10);
    if (!enrollForm.age.trim()) {
      errors.age = "Vui lòng nhập độ tuổi người học";
    } else if (isNaN(ageNum) || ageNum < 4 || ageNum > 80) {
      errors.age = "Độ tuổi hợp lệ từ 4 đến 80 tuổi";
    }

    const cleanParentPhone = enrollForm.parentPhone.replace(/[\s.-]/g, "");
    if (!enrollForm.parentPhone.trim()) {
      errors.parentPhone = "Vui lòng nhập số điện thoại phụ huynh";
    } else if (
      !/^[0-9+\s.-]+$/.test(enrollForm.parentPhone.trim()) ||
      !/^(0|\+84)[1-9][0-9]{8,9}$/.test(cleanParentPhone)
    ) {
      errors.parentPhone = "Số điện thoại phụ huynh không hợp lệ (gồm 10 số, ví dụ: 0912 345 678)";
    }

    const cleanStudentPhone = enrollForm.studentPhone.replace(/[\s.-]/g, "");
    if (!enrollForm.studentPhone.trim()) {
      errors.studentPhone = "Vui lòng nhập số điện thoại người học";
    } else if (
      !/^[0-9+\s.-]+$/.test(enrollForm.studentPhone.trim()) ||
      !/^(0|\+84)[1-9][0-9]{8,9}$/.test(cleanStudentPhone)
    ) {
      errors.studentPhone = "Số điện thoại người học không hợp lệ (gồm 10 số, ví dụ: 0988 123 456)";
    }

    return errors;
  };

  // Gửi đơn đăng ký tham gia lớp
  const handleEnrollmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openSignIn();
      return;
    }

    if (isBooked) {
      setFieldErrors({ form: "Bạn đã gửi yêu cầu cho lớp học này rồi." });
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    addEnrollmentRequest({
      userId: user.id,
      userEmail: user.primaryEmailAddress?.emailAddress || "",
      tutorId: classItem.tutorId || "tut-2",
      tutorName: classItem.tutorName || "Gia sư EduTutor",
      classId: classItem.code,
      classTitle: classItem.title,
      subject: classItem.subject,
      grade: classItem.grade,
      teachingMode: classItem.teachingMode,
      schedule: classItem.schedule,
      address: classItem.teachingMode === "online" ? "Học trực tuyến" : classItem.address,
      studentName: enrollForm.studentName.trim(),
      gender: enrollForm.gender,
      age: parseInt(enrollForm.age, 10),
      parentPhone: enrollForm.parentPhone.trim(),
      studentPhone: enrollForm.studentPhone.trim(),
    });

    setIsEnrollModalOpen(false);
    setEnrollNotification(
      `Gửi yêu cầu đăng ký lớp ${classItem.code} thành công! Yêu cầu đang ở trạng thái "Chờ duyệt". Bạn có thể theo dõi trong Profile.`,
    );
    setTimeout(() => setEnrollNotification(null), 8000);
  };

  // State bình luận
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

    const newComment: ClassComment = {
      id: `cm-temp-${commentIdCounter.current}`,
      author: userName,
      initials: userInitials.toUpperCase(),
      avatarColor: "from-blue-600 to-purple-600",
      content: newCommentText.trim(),
      date: "Vừa xong",
      replies: [],
    };

    setComments((prev) => [newComment, ...prev]);
    setNewCommentText("");
  };

  const handleAddReply = (parentCommentId: string) => {
    if (!replyText.trim()) return;

    if (!isSignedIn) {
      openSignIn();
      return;
    }

    const userName = user?.fullName || user?.firstName || "Bạn";
    const userInitials = (user?.firstName?.[0] || "U") + (user?.lastName?.[0] || "");
    commentIdCounter.current += 1;

    const reply: ClassComment = {
      id: `rep-temp-${commentIdCounter.current}`,
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
      }),
    );

    setReplyingToId(null);
    setReplyText("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/Home" className="hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/classes" className="hover:text-blue-600 transition-colors">
                Lớp học
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href={`/classes?category=${classItem.category}`}
                className="hover:text-blue-600 transition-colors"
              >
                {classItem.categoryName}
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-gray-900">{classItem.code}</li>
          </ol>
        </nav>

        {/* Thông báo đăng ký tham gia lớp thành công (Chờ duyệt) */}
        {enrollNotification && (
          <div
            role="status"
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs animate-in fade-in"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                ✓
              </span>
              <span>{enrollNotification}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <Link
                href="/profile"
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
              >
                Xem Profile
              </Link>
              <button
                type="button"
                onClick={() => setEnrollNotification(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold p-1 cursor-pointer"
                aria-label="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Thông báo đăng ký nhận lớp thành công (Gia sư) */}
        {applyNotification && (
          <div
            role="status"
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-xs animate-in fade-in"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{applyNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setApplyNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold p-1 cursor-pointer"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {/* 9. THÔNG TIN CHI TIẾT LỚP HỌC */}
        <article className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6">
          {/* Header chi tiết: Mã lớp, Trạng thái, Tiêu đề */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-gray-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                  Mã lớp: {classItem.code}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-100 text-purple-800">
                  {classItem.categoryName}
                </span>
                {classItem.status === "needing" ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đang cần tuyển gia sư
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ✓ Đã có gia sư nhận lớp
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {classItem.title}
              </h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{classItem.address}</span>
              </p>
            </div>

            {/* Khối học phí + Trạng thái tuyển sinh */}
            <div className="sm:text-right shrink-0">
              <span className="text-xs text-gray-400 block uppercase">Mức học phí / lương</span>
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {classItem.fee}
              </span>
              {classItem.status === "needing" ? (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={isApplied}
                    onClick={handleApply}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isApplied
                        ? "bg-emerald-100 text-emerald-800 cursor-default"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white active:scale-98 cursor-pointer"
                    }`}
                  >
                    {isApplied ? "✓ Đã đăng ký nhận lớp" : "Đăng ký nhận lớp ngay"}
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  {classStatus === "paused" ? (
                    <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Tạm dừng tuyển sinh
                    </span>
                  ) : classStatus === "ended" ? (
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      Lớp đã kết thúc
                    </span>
                  ) : isSoldOut ? (
                    <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      Đã hết slot
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Còn {availableSlots} slot ({totalEnrolled}/{capacity})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bảng thuộc tính chi tiết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 block">Môn học & Khối:</span>
              <span className="font-bold text-gray-900 text-sm">{classItem.subject} – {classItem.grade}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Hình thức học:</span>
              <span className="font-semibold text-purple-700 text-sm capitalize">
                {classItem.teachingMode === "online" ? "Online" : classItem.teachingMode === "both" ? "Online & Trực tiếp" : "Trực tiếp tại nhà"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Thời gian học:</span>
              <span className="font-semibold text-gray-900 text-sm">{classItem.schedule}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Số buổi mỗi tuần:</span>
              <span className="font-semibold text-gray-900 text-sm">{classItem.sessionsPerWeek} buổi / tuần</span>
            </div>
            <div>
              <span className="text-gray-400 block">Thời lượng buổi học:</span>
              <span className="font-semibold text-gray-900 text-sm">{classItem.sessionDuration}</span>
            </div>
            <div>
              <span className="text-gray-400 block">
                {classItem.status === "with" ? "Sĩ số & Chỗ trống:" : "Thông tin liên hệ:"}
              </span>
              <span className="font-semibold text-blue-600 text-sm">
                {classItem.status === "with"
                  ? classStatus === "paused"
                    ? "Tạm dừng tuyển sinh"
                    : classStatus === "ended"
                    ? "Lớp đã kết thúc"
                    : isSoldOut
                    ? `Đã hết slot (${totalEnrolled}/${capacity})`
                    : `${totalEnrolled}/${capacity} học viên (Còn ${availableSlots} chỗ)`
                  : classItem.contact}
              </span>
            </div>
          </div>

          {/* Mô tả chi tiết */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">Mô tả chi tiết lớp học</h2>
            <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-xl border border-gray-100">
              {classItem.description}
            </p>
          </div>

          {/* Yêu cầu đối với gia sư */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">Yêu cầu đối với gia sư</h2>
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-sm text-blue-900 leading-relaxed">
              {classItem.requirements}
            </div>
          </div>

          {/* 1. KHU VỰC GIA SƯ PHỤ TRÁCH & THAO TÁC (YÊU CẦU 1, 2, 3, 4) */}
          {classItem.tutorName && (
            <div className="p-5 sm:p-6 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                      Gia sư phụ trách lớp này
                    </h2>
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold text-gray-900">{classItem.tutorName}</p>
                  {classItem.tutorBio && (
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{classItem.tutorBio}</p>
                  )}
                </div>

                {/* Badge trạng thái slot & lớp */}
                <div className="shrink-0 sm:text-right">
                  {classStatus === "paused" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                      Tạm dừng tuyển sinh
                    </span>
                  ) : classStatus === "ended" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700 border border-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                      Lớp đã kết thúc
                    </span>
                  ) : isSoldOut ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      Đã hết slot ({totalEnrolled}/{capacity})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Còn {availableSlots} slot ({totalEnrolled}/{capacity} học viên)
                    </span>
                  )}
                </div>
              </div>

              {/* Hiển thị số điện thoại khi người dùng đã đăng nhập và yêu cầu xem liên hệ */}
              {isSignedIn && isPhoneVisible && (
                <div className="p-3.5 rounded-xl bg-white border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Số điện thoại gia sư:</span>
                      <a href={`tel:${tutorPhone.replace(/\s+/g, "")}`} className="font-extrabold text-sm sm:text-base text-purple-800 hover:underline">
                        {tutorPhone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="px-3 py-1.5 text-xs rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold cursor-pointer border border-purple-200 transition-colors"
                    >
                      {copiedPhone ? "✓ Đã chép SĐT" : "Sao chép SĐT"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(true)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer border border-gray-200 transition-colors"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              )}

              {/* KHU VỰC THAO TÁC: GỒM 2 NÚT "LIÊN HỆ GIA SƯ" & "ĐĂNG KÝ THAM GIA LỚP" */}
              <div className="pt-3 border-t border-purple-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Nút 1: Liên hệ gia sư */}
                <button
                  type="button"
                  id="btn-contact-tutor"
                  onClick={handleContactTutor}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-purple-300 bg-white text-purple-700 hover:bg-purple-100/70 hover:border-purple-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
                >
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{isSignedIn && isPhoneVisible ? `Liên hệ gia sư (${tutorPhone})` : "Liên hệ gia sư"}</span>
                </button>

                {/* Nút 2: Đăng ký tham gia lớp */}
                {isBooked ? (
                  <button
                    type="button"
                    id="btn-enroll-class"
                    disabled
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 cursor-not-allowed flex items-center justify-center gap-2 shadow-2xs"
                    title="Bạn đã gửi yêu cầu tham gia lớp học này"
                  >
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>✓ Đã gửi yêu cầu</span>
                  </button>
                ) : classStatus === "paused" ? (
                  <button
                    type="button"
                    id="btn-enroll-class"
                    disabled
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 border border-amber-300 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Lớp tạm dừng</span>
                  </button>
                ) : classStatus === "ended" ? (
                  <button
                    type="button"
                    id="btn-enroll-class"
                    disabled
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Lớp đã kết thúc</span>
                  </button>
                ) : isSoldOut ? (
                  <button
                    type="button"
                    id="btn-enroll-class"
                    disabled
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Đã hết slot</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-enroll-class"
                    onClick={handleOpenEnrollModal}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>Đăng ký tham gia lớp</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </article>

        {/* MODAL 1: THÔNG TIN LIÊN HỆ GIA SƯ */}
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[70] bg-gray-950/50 backdrop-blur-xs p-4 flex items-center justify-center overflow-y-auto">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="contact-modal-title"
              className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95"
            >
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
                <div>
                  <h2 id="contact-modal-title" className="text-xl font-bold text-gray-900">
                    Liên hệ gia sư phụ trách
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Lớp {classItem.code}: {classItem.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Gia sư</p>
                  <p className="text-base font-bold text-gray-900">{classItem.tutorName}</p>
                  {classItem.tutorBio && (
                    <p className="text-xs text-gray-600">{classItem.tutorBio}</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center space-y-2">
                  <span className="text-xs text-gray-500 block">Số điện thoại liên hệ trực tiếp:</span>
                  <div className="text-2xl font-extrabold text-blue-700 tracking-wide font-mono">
                    {tutorPhone}
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <a
                      href={`tel:${tutorPhone.replace(/\s+/g, "")}`}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Gọi điện</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>{copiedPhone ? "✓ Đã chép" : "Sao chép SĐT"}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
                  * Quý phụ huynh và học viên có thể trao đổi trực tiếp về nội dung học hoặc liên hệ hotline EduTutor: <strong>1900 6868</strong> để được điều phối viên tư vấn xếp lịch.
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: FORM ĐĂNG KÝ THAM GIA LỚP (YÊU CẦU 3) */}
        {isEnrollModalOpen && (
          <div className="fixed inset-0 z-[70] bg-gray-950/50 backdrop-blur-xs p-4 flex items-center justify-center overflow-y-auto">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="enrollment-modal-title"
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95"
            >
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
                <div>
                  <h2 id="enrollment-modal-title" className="text-xl font-bold text-gray-900">
                    Đăng ký tham gia lớp học
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {classItem.code} • {classItem.subject} {classItem.grade} • {classItem.tutorName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
                  aria-label="Đóng form đăng ký"
                >
                  ✕
                </button>
              </div>

              {/* Tóm tắt thông tin lớp */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-blue-500 block text-[11px]">Học phí:</span>
                  <span className="font-bold">{classItem.fee}</span>
                </div>
                <div>
                  <span className="text-blue-500 block text-[11px]">Lịch học:</span>
                  <span className="font-semibold">{classItem.schedule}</span>
                </div>
                <div>
                  <span className="text-blue-500 block text-[11px]">Hình thức:</span>
                  <span className="font-semibold capitalize">
                    {classItem.teachingMode === "online" ? "Online" : classItem.teachingMode === "offline" ? "Trực tiếp" : "Online & Trực tiếp"}
                  </span>
                </div>
              </div>

              {fieldErrors.form && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                  {fieldErrors.form}
                </div>
              )}

              {/* Form nhập thông tin người học */}
              <form onSubmit={handleEnrollmentSubmit} className="space-y-4 pt-1">
                {/* Họ và tên người học */}
                <div>
                  <label htmlFor="enroll-student-name" className="block text-xs font-semibold text-gray-700 mb-1">
                    Họ và tên người học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="enroll-student-name"
                    type="text"
                    required
                    value={enrollForm.studentName}
                    onChange={(e) => {
                      setEnrollForm({ ...enrollForm, studentName: e.target.value });
                      if (fieldErrors.studentName) {
                        setFieldErrors({ ...fieldErrors, studentName: "" });
                      }
                    }}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className={`w-full p-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-colors ${
                      fieldErrors.studentName
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/30"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {fieldErrors.studentName && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.studentName}</p>
                  )}
                </div>

                {/* Giới tính & Độ tuổi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="enroll-gender" className="block text-xs font-semibold text-gray-700 mb-1">
                      Giới tính <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="enroll-gender"
                      required
                      value={enrollForm.gender}
                      onChange={(e) => setEnrollForm({ ...enrollForm, gender: e.target.value as "male" | "female" | "other" })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="enroll-age" className="block text-xs font-semibold text-gray-700 mb-1">
                      Độ tuổi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="enroll-age"
                      type="number"
                      min="4"
                      max="80"
                      required
                      value={enrollForm.age}
                      onChange={(e) => {
                        setEnrollForm({ ...enrollForm, age: e.target.value });
                        if (fieldErrors.age) {
                          setFieldErrors({ ...fieldErrors, age: "" });
                        }
                      }}
                      placeholder="Ví dụ: 16"
                      className={`w-full p-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-colors ${
                        fieldErrors.age
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/30"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                    {fieldErrors.age && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.age}</p>
                    )}
                  </div>
                </div>

                {/* Số điện thoại phụ huynh & Số điện thoại người học */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="enroll-parent-phone" className="block text-xs font-semibold text-gray-700 mb-1">
                      Số điện thoại phụ huynh (chỉ cần một người) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="enroll-parent-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      value={enrollForm.parentPhone}
                      onChange={(e) => {
                        setEnrollForm({ ...enrollForm, parentPhone: e.target.value });
                        if (fieldErrors.parentPhone) {
                          setFieldErrors({ ...fieldErrors, parentPhone: "" });
                        }
                      }}
                      placeholder="Ví dụ: 0912 345 678"
                      className={`w-full p-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-colors ${
                        fieldErrors.parentPhone
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/30"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                    {fieldErrors.parentPhone && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.parentPhone}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="enroll-student-phone" className="block text-xs font-semibold text-gray-700 mb-1">
                      Số điện thoại người học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="enroll-student-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      value={enrollForm.studentPhone}
                      onChange={(e) => {
                        setEnrollForm({ ...enrollForm, studentPhone: e.target.value });
                        if (fieldErrors.studentPhone) {
                          setFieldErrors({ ...fieldErrors, studentPhone: "" });
                        }
                      }}
                      placeholder="Ví dụ: 0988 123 456"
                      className={`w-full p-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 transition-colors ${
                        fieldErrors.studentPhone
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/30"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                    {fieldErrors.studentPhone && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.studentPhone}</p>
                    )}
                  </div>
                </div>

                {/* Chú thích luồng duyệt */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed">
                  <p className="font-semibold text-gray-800">Quy trình đăng ký:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-gray-500">
                    <li>Yêu cầu đăng ký sẽ ở trạng thái <strong>&quot;Chờ duyệt&quot;</strong> sau khi gửi.</li>
                    <li>Slot lớp học chỉ được tính là đã giữ chỗ sau khi Admin phê duyệt yêu cầu.</li>
                    <li>Bạn có thể theo dõi tiến độ duyệt hồ sơ trong trang <strong>Profile</strong>.</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-98"
                  >
                    Gửi yêu cầu đăng ký
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 10. PHẦN ĐÁNH GIÁ */}
        <section aria-labelledby="reviews-heading" className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 id="reviews-heading" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Đánh giá từ phụ huynh & học sinh</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Nhận xét thực tế về chất lượng giảng dạy và sự tiến bộ của học viên
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              {classItem.reviewCount} đánh giá
            </span>
          </div>

          {/* Thống kê điểm số và phân bố sao */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-xl bg-gray-50 border border-gray-100 items-center">
            {/* Điểm trung bình */}
            <div className="text-center space-y-1 border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0">
              <div className="text-4xl font-black text-gray-900">{classItem.averageRating}</div>
              <div className="flex justify-center text-amber-400 text-lg">
                {"★".repeat(Math.floor(classItem.averageRating))}
                {classItem.averageRating % 1 !== 0 && "½"}
              </div>
              <p className="text-xs text-gray-500">Dựa trên {classItem.reviewCount} lượt đánh giá</p>
            </div>

            {/* Phân bố số sao */}
            <div className="col-span-2 space-y-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = classItem.ratingBreakdown[star as keyof typeof classItem.ratingBreakdown] || 0;
                const percent = classItem.reviewCount > 0 ? (count / classItem.reviewCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-12 text-gray-600 font-medium">{star} sao</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <span className="w-8 text-right text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danh sách các đánh giá chi tiết */}
          {classItem.reviews.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Chưa có đánh giá nào cho lớp này.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {classItem.reviews.map((rev) => (
                <div key={rev.id} className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {rev.reviewerName[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{rev.reviewerName}</h4>
                        <div className="flex text-amber-400 text-xs">
                          {"★".repeat(rev.rating)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400">{rev.date}</span>
                  </div>
                  <p className="text-xs text-gray-700 pl-10 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 11. PHẦN BÌNH LUẬN */}
        <section aria-labelledby="comments-heading" className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <h2 id="comments-heading" className="text-xl font-bold text-gray-900">
              Bình luận & Hỏi đáp về lớp học
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Học sinh và gia sư có thể trao đổi về yêu cầu lớp tại đây
            </p>
          </div>

          {/* Form nhập bình luận */}
          <form onSubmit={handleAddComment} className="space-y-3">
            <div>
              <label htmlFor="comment-input" className="block text-xs font-semibold text-gray-700 mb-1">
                Để lại bình luận của bạn:
              </label>
              <textarea
                id="comment-input"
                rows={3}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={
                  isSignedIn
                    ? "Nhập câu hỏi hoặc trao đổi về thời gian học, mức học phí..."
                    : "Đăng nhập với Clerk để bình luận..."
                }
                className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-gray-400 italic">
                * Lưu ý: Bình luận chỉ hiển thị trong phiên thử nghiệm frontend hiện tại (chưa lưu backend).
              </span>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs self-end sm:self-auto cursor-pointer"
              >
                Gửi bình luận
              </button>
            </div>
          </form>

          {/* Danh sách bình luận & phản hồi lồng nhau */}
          <div className="divide-y divide-gray-100 pt-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi!
              </p>
            ) : (
              comments.map((cm) => (
                <div key={cm.id} className="py-4 space-y-3">
                  {/* Bình luận cha */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${cm.avatarColor} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs`}
                    >
                      {cm.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-900">{cm.author}</h4>
                        <span className="text-[11px] text-gray-400">{cm.date}</span>
                      </div>
                      <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                        {cm.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => setReplyingToId(replyingToId === cm.id ? null : cm.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 mt-1 inline-block cursor-pointer"
                      >
                        {replyingToId === cm.id ? "Hủy trả lời" : "Trả lời"}
                      </button>
                    </div>
                  </div>

                  {/* Form trả lời lồng nhau 1 cấp */}
                  {replyingToId === cm.id && (
                    <div className="ml-12 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập nội dung trả lời..."
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-hidden focus:border-blue-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyText("");
                          }}
                          className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-md cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddReply(cm.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 cursor-pointer"
                        >
                          Gửi phản hồi
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Danh sách phản hồi con (lồng nhau tối đa 1 cấp) */}
                  {cm.replies && cm.replies.length > 0 && (
                    <div className="ml-10 space-y-2.5 pt-2 border-l-2 border-gray-100 pl-4">
                      {cm.replies.map((rep) => (
                        <div key={rep.id} className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full bg-gradient-to-br ${rep.avatarColor} text-white font-bold flex items-center justify-center text-[10px] shrink-0 shadow-xs`}
                          >
                            {rep.initials}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-semibold text-gray-900">{rep.author}</h5>
                              <span className="text-[10px] text-gray-400">{rep.date}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                              {rep.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
