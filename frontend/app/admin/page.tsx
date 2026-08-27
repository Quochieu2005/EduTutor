"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  adminApproveTutor,
  adminCreateLesson,
  adminDeleteLesson,
  adminDeleteTutor,
  adminGetLessons,
  adminGetTutors,
  adminRejectTutor,
  adminUpdateLesson,
  adminUpdateTutor,
} from "@/lib/api";
import { LOCATIONS, SUBJECTS } from "@/lib/mock-data";
import type {
  LessonRequest,
  LessonStatus,
  TutorProfile,
  TutorStatus,
} from "@/lib/types";
import { Badge, formatCurrency } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type AdminTab =
  | "dashboard"
  | "tutors"
  | "regions"
  | "lessons"
  | "schedule"
  | "security";

const ADMIN_PASSCODE_KEY = "admin_passcode";
const ADMIN_AUTH_KEY = "admin_authenticated";
const ADMIN_AUTH_VERSION_KEY = "admin_auth_version";
const DEFAULT_ADMIN_PASSCODE = "2005";
const ADMIN_AUTH_VERSION = "2";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [lessons, setLessons] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Access Gate State
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [passcodeMessage, setPasscodeMessage] = useState("");
  const [isSessionAdmin, setIsSessionAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem(ADMIN_AUTH_KEY) === "true" &&
      localStorage.getItem(ADMIN_AUTH_VERSION_KEY) === ADMIN_AUTH_VERSION
    );
  });

  const isClerkAdmin =
    isLoaded &&
    ((user?.publicMetadata as { role?: string })?.role === "admin" ||
      user?.primaryEmailAddress?.emailAddress?.includes("admin") ||
      user?.username?.includes("admin"));

  const isAuthorized = isClerkAdmin || isSessionAdmin;

  // Filters for Tutors tab
  const [tutorSearch, setTutorSearch] = useState("");
  const [tutorStatusFilter, setTutorStatusFilter] = useState<string>("all");
  const [tutorSubjectFilter, setTutorSubjectFilter] = useState<string>("all");
  const [tutorLocationFilter, setTutorLocationFilter] = useState<string>("all");

  // Filters for Region tab
  const [selectedRegion, setSelectedRegion] = useState<string>("Hà Nội");

  // Filters for Lessons tab
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonStatusFilter, setLessonStatusFilter] = useState<string>("all");

  // Modal States
  const [viewingTutor, setViewingTutor] = useState<TutorProfile | null>(null);
  const [editingTutor, setEditingTutor] = useState<TutorProfile | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRequest | null>(
    null,
  );
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);

  // New / Edit Lesson Form State
  const [lessonFormData, setLessonFormData] = useState({
    studentName: "",
    studentPhone: "",
    tutorId: "",
    subject: "Toán",
    message: "",
    preferredDate: new Date().toISOString().split("T")[0],
    preferredTime: "18:00",
    location: "Hà Nội",
    hourlyRate: 200000,
    status: "accepted" as LessonStatus,
    notes: "",
  });

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    let ignore = false;
    Promise.all([adminGetTutors(), adminGetLessons()])
      .then(([tData, lData]) => {
        if (!ignore) {
          setTutors(tData);
          setLessons(lData);
        }
      })
      .catch(() => {
        // Ignore error
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isAuthorized]);

  function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const savedPasscode =
      localStorage.getItem(ADMIN_PASSCODE_KEY) || DEFAULT_ADMIN_PASSCODE;
    if (passcode.trim() === savedPasscode) {
      localStorage.setItem(ADMIN_AUTH_KEY, "true");
      localStorage.setItem(ADMIN_AUTH_VERSION_KEY, ADMIN_AUTH_VERSION);
      setIsSessionAdmin(true);
      setAuthError("");
    } else {
      setAuthError("Mật mã quản trị không chính xác. Vui lòng kiểm tra lại.");
    }
  }

  function handleLogoutAdmin() {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_AUTH_VERSION_KEY);
    setIsSessionAdmin(false);
    router.push("/");
  }

  function handleChangePasscode(e: React.FormEvent) {
    e.preventDefault();
    const savedPasscode =
      localStorage.getItem(ADMIN_PASSCODE_KEY) || DEFAULT_ADMIN_PASSCODE;

    if (currentPasscode.trim() !== savedPasscode) {
      setPasscodeMessage("Mã hiện tại không chính xác.");
      return;
    }
    if (!/^\d{4,}$/.test(newPasscode.trim())) {
      setPasscodeMessage("Mã mới phải có ít nhất 4 chữ số.");
      return;
    }
    if (newPasscode.trim() !== confirmPasscode.trim()) {
      setPasscodeMessage("Mã xác nhận không khớp.");
      return;
    }

    localStorage.setItem(ADMIN_PASSCODE_KEY, newPasscode.trim());
    setCurrentPasscode("");
    setNewPasscode("");
    setConfirmPasscode("");
    setPasscodeMessage("Đã đổi mã quản trị thành công.");
  }

  // Tutor Action Handlers
  async function handleApproveTutor(id: string) {
    try {
      const updated = await adminApproveTutor(id);
      setTutors((prev) => prev.map((t) => (t.id === id ? updated : t)));
      alert("Đã duyệt gia sư thành công!");
    } catch {
      alert("Không thể duyệt gia sư.");
    }
  }

  async function handleRejectTutor(id: string) {
    try {
      const updated = await adminRejectTutor(id);
      setTutors((prev) => prev.map((t) => (t.id === id ? updated : t)));
      alert("Đã từ chối hồ sơ gia sư.");
    } catch {
      alert("Không thể từ chối hồ sơ.");
    }
  }

  async function handleDeleteTutor(id: string, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa hồ sơ gia sư "${name}"?`)) return;
    try {
      await adminDeleteTutor(id);
      setTutors((prev) => prev.filter((t) => t.id !== id));
      if (viewingTutor?.id === id) setViewingTutor(null);
      if (editingTutor?.id === id) setEditingTutor(null);
      alert("Đã xóa gia sư thành công.");
    } catch {
      alert("Không thể xóa gia sư.");
    }
  }

  async function handleSaveEditTutor(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTutor) return;
    try {
      const updated = await adminUpdateTutor(editingTutor.id, editingTutor);
      setTutors((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTutor(null);
      alert("Cập nhật thông tin gia sư thành công!");
    } catch {
      alert("Không thể cập nhật thông tin.");
    }
  }

  // Lesson Action Handlers
  async function handleSaveLesson(e: React.FormEvent) {
    e.preventDefault();
    const targetTutor = tutors.find((t) => t.id === lessonFormData.tutorId);
    const tutorName = targetTutor ? targetTutor.fullName : "Gia sư EduTutor";

    try {
      if (isCreatingLesson) {
        const created = await adminCreateLesson({
          ...lessonFormData,
          tutorName,
        });
        setLessons((prev) => [created, ...prev]);
        setIsCreatingLesson(false);
        alert("Tạo lớp học mới thành công!");
      } else if (editingLesson) {
        const updated = await adminUpdateLesson(editingLesson.id, {
          ...lessonFormData,
          tutorName,
        });
        setLessons((prev) =>
          prev.map((l) => (l.id === updated.id ? updated : l)),
        );
        setEditingLesson(null);
        alert("Cập nhật lớp học thành công!");
      }
    } catch {
      alert("Thao tác thất bại.");
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Bạn có chắc muốn xóa lớp học này?")) return;
    try {
      await adminDeleteLesson(id);
      setLessons((prev) => prev.filter((l) => l.id !== id));
      alert("Đã xóa lớp học thành công.");
    } catch {
      alert("Không thể xóa lớp học.");
    }
  }

  async function handleQuickLessonStatus(
    id: string,
    status: LessonRequest["status"],
  ) {
    try {
      const updated = await adminUpdateLesson(id, { status });
      setLessons((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch {
      alert("Không thể cập nhật trạng thái.");
    }
  }

  // Computed Stats
  const pendingTutorsCount = useMemo(
    () => tutors.filter((t) => t.status === "pending" || !t.isVerified).length,
    [tutors],
  );
  const approvedTutorsCount = useMemo(
    () => tutors.filter((t) => t.status === "approved" || t.isVerified).length,
    [tutors],
  );
  const activeLessonsCount = useMemo(
    () =>
      lessons.filter((l) => l.status === "accepted" || l.status === "pending")
        .length,
    [lessons],
  );
  const completedLessonsCount = useMemo(
    () => lessons.filter((l) => l.status === "completed").length,
    [lessons],
  );

  // Filtered Tutors List
  const filteredTutors = useMemo(() => {
    return tutors.filter((t) => {
      const matchSearch =
        !tutorSearch ||
        t.fullName.toLowerCase().includes(tutorSearch.toLowerCase()) ||
        t.email.toLowerCase().includes(tutorSearch.toLowerCase()) ||
        (t.phone && t.phone.includes(tutorSearch));

      const matchStatus =
        tutorStatusFilter === "all" ||
        (tutorStatusFilter === "pending" &&
          (t.status === "pending" || !t.isVerified)) ||
        (tutorStatusFilter === "approved" &&
          (t.status === "approved" || t.isVerified)) ||
        (tutorStatusFilter === "rejected" && t.status === "rejected");

      const matchSubject =
        tutorSubjectFilter === "all" || t.subjects.includes(tutorSubjectFilter);

      const matchLocation =
        tutorLocationFilter === "all" ||
        t.location.includes(tutorLocationFilter);

      return matchSearch && matchStatus && matchSubject && matchLocation;
    });
  }, [
    tutors,
    tutorSearch,
    tutorStatusFilter,
    tutorSubjectFilter,
    tutorLocationFilter,
  ]);

  // Region Breakdown Stats
  const regionBreakdown = useMemo(() => {
    const map: Record<
      string,
      { total: number; approved: number; pending: number }
    > = {};
    LOCATIONS.forEach((loc) => {
      map[loc] = { total: 0, approved: 0, pending: 0 };
    });
    tutors.forEach((t) => {
      const loc = LOCATIONS.find((l) => t.location.includes(l)) || "Khác";
      if (!map[loc]) map[loc] = { total: 0, approved: 0, pending: 0 };
      map[loc].total++;
      if (t.isVerified || t.status === "approved") map[loc].approved++;
      else map[loc].pending++;
    });
    return map;
  }, [tutors]);

  // Tutors in Selected Region
  const regionTutors = useMemo(() => {
    return tutors.filter((t) => t.location.includes(selectedRegion));
  }, [tutors, selectedRegion]);

  // Filtered Lessons List
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const matchSearch =
        !lessonSearch ||
        l.studentName.toLowerCase().includes(lessonSearch.toLowerCase()) ||
        l.tutorName.toLowerCase().includes(lessonSearch.toLowerCase()) ||
        l.subject.toLowerCase().includes(lessonSearch.toLowerCase());

      const matchStatus =
        lessonStatusFilter === "all" || l.status === lessonStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [lessons, lessonSearch, lessonStatusFilter]);

  function openCreateLessonModal() {
    setLessonFormData({
      studentName: "",
      studentPhone: "",
      tutorId: tutors[0]?.id || "t1",
      subject: "Toán",
      message: "Lớp học mới do Admin tạo",
      preferredDate: new Date().toISOString().split("T")[0],
      preferredTime: "18:00",
      location: "Hà Nội",
      hourlyRate: 200000,
      status: "accepted",
      notes: "",
    });
    setIsCreatingLesson(true);
  }

  function openEditLessonModal(lesson: LessonRequest) {
    setEditingLesson(lesson);
    setLessonFormData({
      studentName: lesson.studentName,
      studentPhone: lesson.studentPhone || "",
      tutorId: lesson.tutorId,
      subject: lesson.subject,
      message: lesson.message,
      preferredDate: lesson.preferredDate,
      preferredTime: lesson.preferredTime,
      location: lesson.location || "Hà Nội",
      hourlyRate: lesson.hourlyRate || 200000,
      status: lesson.status,
      notes: lesson.notes || "",
    });
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-red-500/30">
            🔒
          </div>
          <h1 className="text-2xl font-black mb-2">Khu Vực Quản Trị Viên</h1>
          <p className="text-gray-300 text-xs sm:text-sm mb-6 leading-relaxed">
            Trang này chỉ dành riêng cho Ban Quản Trị EduTutor. Vui lòng nhập
            mật mã quản trị hoặc đăng nhập tài khoản Admin để tiếp tục.
          </p>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-2xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Mật mã quản trị viên (Admin Passcode)
              </label>
              <input
                type="password"
                required
                placeholder="Nhập mã xác thực quản trị..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white/20 border border-white/30 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {authError && (
                <p className="text-red-400 text-xs mt-1.5 font-medium">
                  {authError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              className="h-11 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 font-bold text-sm shadow-lg shadow-purple-500/25"
            >
              Xác thực &amp; Vào trang Quản Trị →
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-gray-400">
            <Link href="/" className="hover:text-white transition underline">
              ← Trở về trang chủ
            </Link>
            <Link
              href="/login"
              className="hover:text-white transition underline"
            >
              Đăng nhập tài khoản
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium text-sm">
            Đang tải dữ liệu Admin Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 pb-16">
      {/* Top Admin Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/20">
                🛡️
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <span>EduTutor Admin Portal</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-3xs font-black uppercase">
                    Quản Trị Viên
                  </span>
                </h1>
                <p className="text-xs text-gray-500">
                  Hệ thống phê duyệt gia sư, quản lý lớp học và điều phối giáo
                  viên khu vực
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/become-tutor">
                <Button variant="outline" size="sm">
                  + Đăng ký gia sư
                </Button>
              </Link>
              <Button size="sm" onClick={openCreateLessonModal}>
                + Tạo lớp học mới
              </Button>
              <button
                onClick={handleLogoutAdmin}
                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition flex items-center gap-1"
                title="Khóa quyền quản trị và đăng xuất"
              >
                <span>🔒</span>
                <span>Khóa Admin</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-4 border-t border-gray-100 overflow-x-auto py-2 -mb-px">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>📊</span>
              <span>Tổng quan</span>
            </button>

            <button
              onClick={() => setActiveTab("tutors")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "tutors"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>👨‍🏫</span>
              <span>Quản lý &amp; Duyệt gia sư</span>
              {pendingTutorsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-gray-900 text-3xs font-black">
                  {pendingTutorsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("regions")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "regions"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>📍</span>
              <span>Giáo viên theo khu vực</span>
            </button>

            <button
              onClick={() => setActiveTab("lessons")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "lessons"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>📚</span>
              <span>Quản lý lớp học</span>
              <span className="px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 text-3xs font-bold">
                {lessons.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "schedule"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>📅</span>
              <span>Lịch học &amp; Lịch biểu</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>🔑</span>
              <span>Bảo mật</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === "security" && (
          <section className="max-w-xl bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-gray-900">
                Đổi mã quản trị
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Mã mặc định hiện tại là 2005. Mã mới được lưu trên thiết bị này.
              </p>
            </div>
            <form onSubmit={handleChangePasscode} className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Mã hiện tại
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  value={currentPasscode}
                  onChange={(e) => setCurrentPasscode(e.target.value)}
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Mã mới
                <input
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  required
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Xác nhận mã mới
                <input
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              {passcodeMessage && (
                <p className="text-sm font-medium text-blue-600">
                  {passcodeMessage}
                </p>
              )}
              <Button type="submit">Lưu mã mới</Button>
            </form>
          </section>
        )}
        {/* ========================================================================= */}
        {/* TAB 1: TỔNG QUAN (DASHBOARD) */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                  <span>Gia sư chờ duyệt</span>
                  <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-base">
                    ⏳
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600">
                  {pendingTutorsCount}
                </div>
                <p className="text-2xs text-gray-400 mt-1">
                  Cần xem xét &amp; xác minh
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                  <span>Gia sư đã duyệt</span>
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                    ✓
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {approvedTutorsCount}
                </div>
                <p className="text-2xs text-gray-400 mt-1">
                  Đang hiển thị trên sàn
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                  <span>Lớp học đang dạy</span>
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-base">
                    📖
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-600">
                  {activeLessonsCount}
                </div>
                <p className="text-2xs text-gray-400 mt-1">Lớp đã xếp lịch</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                  <span>Lớp học hoàn thành</span>
                  <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-base">
                    🎓
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-600">
                  {completedLessonsCount}
                </div>
                <p className="text-2xs text-gray-400 mt-1">
                  Đã kết thúc khóa học
                </p>
              </div>
            </div>

            {/* Pending Tutors Alert Section */}
            {pendingTutorsCount > 0 && (
              <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <h2 className="font-extrabold text-gray-900 text-sm sm:text-base">
                      Có {pendingTutorsCount} hồ sơ gia sư mới đang chờ xét
                      duyệt
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("tutors");
                      setTutorStatusFilter("pending");
                    }}
                    className="text-xs font-bold text-amber-800 hover:underline"
                  >
                    Xem tất cả →
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tutors
                    .filter((t) => t.status === "pending" || !t.isVerified)
                    .slice(0, 3)
                    .map((tutor) => (
                      <div
                        key={tutor.id}
                        className="bg-white rounded-xl p-3.5 border border-amber-200/60 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-sm text-gray-900">
                              {tutor.fullName}
                            </span>
                            <Badge variant="warning">Chờ duyệt</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {tutor.location} · {tutor.education || "Cử nhân"}
                          </p>
                          <p className="text-2xs text-blue-600 font-semibold mb-3">
                            Môn: {tutor.subjects.join(", ")}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleApproveTutor(tutor.id)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            onClick={() => setViewingTutor(tutor)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Quick Overview Tables */}
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left: Phân bố theo khu vực */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h3 className="font-extrabold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                    <span>📍</span>
                    <span>Phân bố giáo viên theo khu vực</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("regions")}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Quản lý khu vực →
                  </button>
                </div>

                <div className="space-y-3">
                  {LOCATIONS.map((loc) => {
                    const stats = regionBreakdown[loc] || {
                      total: 0,
                      approved: 0,
                      pending: 0,
                    };
                    const percentage =
                      tutors.length > 0
                        ? (stats.total / tutors.length) * 100
                        : 0;
                    return (
                      <div key={loc} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-gray-700">
                          <span>{loc}</span>
                          <span>
                            {stats.total} giáo viên ({stats.approved} đã duyệt)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            style={{ width: `${Math.max(percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Yêu cầu học mới nhất */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h3 className="font-extrabold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                    <span>📚</span>
                    <span>Lớp học &amp; Yêu cầu mới</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("lessons")}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Xem tất cả lớp →
                  </button>
                </div>

                <div className="space-y-3">
                  {lessons.slice(0, 4).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <span>{lesson.studentName}</span>
                          <span className="text-gray-400">➔</span>
                          <span className="text-blue-600">
                            {lesson.tutorName}
                          </span>
                        </div>
                        <p className="text-gray-500 mt-0.5">
                          Môn {lesson.subject} · {lesson.preferredDate} (
                          {lesson.preferredTime})
                        </p>
                      </div>
                      <Badge
                        variant={
                          lesson.status === "accepted"
                            ? "success"
                            : lesson.status === "pending"
                              ? "warning"
                              : "default"
                        }
                      >
                        {lesson.status === "accepted"
                          ? "Đã duyệt"
                          : lesson.status === "pending"
                            ? "Chờ xử lý"
                            : lesson.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: QUẢN LÝ & DUYỆT GIA SƯ */}
        {/* ========================================================================= */}
        {activeTab === "tutors" && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, SĐT..."
                  value={tutorSearch}
                  onChange={(e) => setTutorSearch(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">
                  Trạng thái hồ sơ
                </label>
                <select
                  value={tutorStatusFilter}
                  onChange={(e) => setTutorStatusFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">
                    Chờ phê duyệt ({pendingTutorsCount})
                  </option>
                  <option value="approved">
                    Đã phê duyệt ({approvedTutorsCount})
                  </option>
                  <option value="rejected">Đã từ chối</option>
                </select>
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">
                  Môn giảng dạy
                </label>
                <select
                  value={tutorSubjectFilter}
                  onChange={(e) => setTutorSubjectFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="all">Tất cả môn học</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">
                  Khu vực
                </label>
                <select
                  value={tutorLocationFilter}
                  onChange={(e) => setTutorLocationFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="all">Tất cả khu vực</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tutors Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-extrabold text-gray-900 text-sm">
                  Danh sách gia sư ({filteredTutors.length})
                </h3>
                <Link href="/become-tutor">
                  <Button size="sm">+ Thêm gia sư mới</Button>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-3xs border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Gia sư</th>
                      <th className="px-4 py-3">Trình độ &amp; Đơn vị</th>
                      <th className="px-4 py-3">Môn dạy</th>
                      <th className="px-4 py-3">Khu vực</th>
                      <th className="px-4 py-3">Học phí / giờ</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTutors.map((tutor) => {
                      const isPending =
                        tutor.status === "pending" || !tutor.isVerified;
                      const isApproved =
                        tutor.status === "approved" || tutor.isVerified;
                      return (
                        <tr
                          key={tutor.id}
                          className="hover:bg-blue-50/30 transition"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                {tutor.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">
                                  {tutor.fullName}
                                </p>
                                <p className="text-3xs text-gray-400">
                                  {tutor.email}{" "}
                                  {tutor.phone ? `· ${tutor.phone}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">
                            {tutor.education || "Cử nhân"}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {tutor.subjects.map((s) => (
                                <span
                                  key={s}
                                  className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-3xs font-semibold"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-700 font-medium">
                            {tutor.location}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-blue-600">
                            {formatCurrency(tutor.hourlyRate)}
                          </td>
                          <td className="px-4 py-3.5">
                            {isPending ? (
                              <Badge variant="warning">Chờ duyệt</Badge>
                            ) : isApproved ? (
                              <Badge variant="success">Đã duyệt</Badge>
                            ) : (
                              <Badge variant="danger">Từ chối</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleApproveTutor(tutor.id)}
                                    title="Duyệt gia sư"
                                    className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition"
                                  >
                                    ✓ Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleRejectTutor(tutor.id)}
                                    title="Từ chối hồ sơ"
                                    className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold transition"
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setViewingTutor(tutor)}
                                title="Xem hồ sơ"
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => setEditingTutor(tutor)}
                                title="Sửa thông tin"
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteTutor(tutor.id, tutor.fullName)
                                }
                                title="Xóa gia sư"
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: QUẢN LÝ GIÁO VIÊN THEO TỪNG KHU VỰC */}
        {/* ========================================================================= */}
        {activeTab === "regions" && (
          <div className="space-y-6">
            {/* Region Selector Pills */}
            <div className="flex flex-wrap gap-2 pb-2">
              {LOCATIONS.map((loc) => {
                const count = regionBreakdown[loc]?.total || 0;
                return (
                  <button
                    key={loc}
                    onClick={() => setSelectedRegion(loc)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      selectedRegion === loc
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <span>📍 {loc}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                        selectedRegion === loc
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Region Summary Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-gray-100 gap-2">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <span>Khu vực: {selectedRegion}</span>
                    <Badge variant="info">
                      {regionTutors.length} Giáo viên
                    </Badge>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Danh sách giáo viên, môn dạy và số học sinh đang phụ trách
                    tại {selectedRegion}
                  </p>
                </div>
              </div>

              {regionTutors.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  Chưa có giáo viên nào đăng ký hoạt động tại khu vực{" "}
                  {selectedRegion}.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regionTutors.map((tutor) => (
                    <div
                      key={tutor.id}
                      className="p-4 rounded-2xl bg-gray-50/60 border border-gray-200/80 hover:bg-white hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900 text-sm">
                            {tutor.fullName}
                          </h4>
                          {tutor.isVerified ? (
                            <Badge variant="success">Đã duyệt</Badge>
                          ) : (
                            <Badge variant="warning">Chờ duyệt</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {tutor.education || "Cử nhân Sư phạm"}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                          📞 {tutor.phone || "Chưa cập nhật"} ·{" "}
                          {tutor.experience} năm KN
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {tutor.subjects.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-3xs font-bold"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs font-bold text-blue-600 mb-4">
                          {formatCurrency(tutor.hourlyRate)}/giờ
                        </p>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-200/60">
                        <button
                          onClick={() => setViewingTutor(tutor)}
                          className="flex-1 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 transition shadow-2xs"
                        >
                          Xem hồ sơ
                        </button>
                        <button
                          onClick={() => setEditingTutor(tutor)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition"
                        >
                          Sửa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: QUẢN LÝ LỚP HỌC (LESSONS & CLASSES) */}
        {/* ========================================================================= */}
        {activeTab === "lessons" && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Tìm theo học sinh, gia sư, môn học..."
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={lessonStatusFilter}
                  onChange={(e) => setLessonStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý (Pending)</option>
                  <option value="accepted">
                    Đã duyệt / Đang học (Accepted)
                  </option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                  <option value="cancelled">Đã hủy (Cancelled)</option>
                </select>
              </div>

              <Button size="sm" onClick={openCreateLessonModal}>
                + Tạo lớp học mới
              </Button>
            </div>

            {/* Lessons Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-3xs border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Mã &amp; Học viên</th>
                      <th className="px-4 py-3">Gia sư phụ trách</th>
                      <th className="px-4 py-3">Môn học</th>
                      <th className="px-4 py-3">Lịch &amp; Địa điểm</th>
                      <th className="px-4 py-3">Học phí</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLessons.map((lesson) => (
                      <tr
                        key={lesson.id}
                        className="hover:bg-blue-50/30 transition"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-gray-900">
                            {lesson.studentName}
                          </p>
                          <p className="text-3xs text-gray-400">
                            {lesson.studentPhone || "Chưa có SĐT"} · ID:{" "}
                            {lesson.id}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-blue-700">
                          {lesson.tutorName}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-3xs">
                            {lesson.subject}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">
                          <p className="font-medium text-gray-900">
                            {lesson.preferredDate} ({lesson.preferredTime})
                          </p>
                          <p className="text-3xs text-gray-400">
                            {lesson.location || "Online"}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-emerald-600">
                          {formatCurrency(lesson.hourlyRate || 200000)}/buổi
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={lesson.status}
                            onChange={(e) =>
                              handleQuickLessonStatus(
                                lesson.id,
                                e.target.value as LessonRequest["status"],
                              )
                            }
                            className={`px-2 py-1 rounded-lg text-3xs font-bold border focus:outline-none ${
                              lesson.status === "accepted"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : lesson.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : lesson.status === "completed"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            <option value="pending">Chờ xử lý</option>
                            <option value="accepted">
                              Đã duyệt / Đang học
                            </option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditLessonModal(lesson)}
                              title="Chỉnh sửa lớp"
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              title="Xóa lớp học"
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: LỊCH HỌC (SCHEDULE & TIMETABLE) */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    Lịch dạy &amp; Ca học toàn hệ thống
                  </h3>
                  <p className="text-xs text-gray-500">
                    Theo dõi lịch trình các buổi học đã được xác nhận (Accepted)
                  </p>
                </div>
                <Button size="sm" onClick={openCreateLessonModal}>
                  + Xếp ca học mới
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lessons
                  .filter((l) => l.status === "accepted")
                  .map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-white border border-blue-100 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-black text-2xs">
                          {lesson.subject}
                        </span>
                        <span className="font-bold text-xs text-purple-700">
                          ⏰ {lesson.preferredTime}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Ngày học: <strong>{lesson.preferredDate}</strong>
                        </p>
                        <p className="font-bold text-gray-900 text-sm mt-1">
                          Học sinh: {lesson.studentName}
                        </p>
                        <p className="text-xs text-blue-700 font-semibold">
                          Gia sư: {lesson.tutorName}
                        </p>
                        <p className="text-2xs text-gray-400 mt-1">
                          Địa điểm: {lesson.location || "Online"}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(lesson.hourlyRate || 200000)}/buổi
                        </span>
                        <button
                          onClick={() => openEditLessonModal(lesson)}
                          className="text-blue-600 hover:underline font-bold text-2xs"
                        >
                          Đổi lịch →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: XEM CHI TIẾT GIA SƯ */}
      {/* ========================================================================= */}
      {viewingTutor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-extrabold flex items-center justify-center text-lg">
                  {viewingTutor.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {viewingTutor.fullName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {viewingTutor.email} · {viewingTutor.phone || "Chưa có SĐT"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingTutor(null)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-gray-700">
              <div className="grid sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl">
                <div>
                  <span className="text-gray-400 text-3xs font-bold uppercase block">
                    Trình độ &amp; Đơn vị
                  </span>
                  <p className="font-semibold">
                    {viewingTutor.education || "Cử nhân"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-3xs font-bold uppercase block">
                    Khu vực giảng dạy
                  </span>
                  <p className="font-semibold">{viewingTutor.location}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-3xs font-bold uppercase block">
                    Học phí đề xuất
                  </span>
                  <p className="font-bold text-blue-600 text-sm">
                    {formatCurrency(viewingTutor.hourlyRate)}/giờ
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-3xs font-bold uppercase block">
                    Kinh nghiệm &amp; Đánh giá
                  </span>
                  <p className="font-semibold">
                    {viewingTutor.experience} năm KN · {viewingTutor.rating}★ (
                    {viewingTutor.reviewCount} đánh giá)
                  </p>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-bold block mb-1.5">
                  Môn học nhận dạy:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingTutor.subjects.map((s) => (
                    <Badge key={s} variant="info">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-bold block mb-1.5">
                  Giới thiệu bản thân &amp; Phương pháp dạy:
                </span>
                <p className="p-3.5 bg-gray-50 rounded-xl text-gray-600 leading-relaxed">
                  {viewingTutor.bio}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              {(!viewingTutor.isVerified ||
                viewingTutor.status === "pending") && (
                <button
                  onClick={() => {
                    handleApproveTutor(viewingTutor.id);
                    setViewingTutor(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  ✓ Duyệt gia sư này
                </button>
              )}
              <button
                onClick={() => setViewingTutor(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHỈNH SỬA GIA SƯ */}
      {/* ========================================================================= */}
      {editingTutor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">
                Chỉnh sửa hồ sơ gia sư
              </h3>
              <button
                onClick={() => setEditingTutor(null)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTutor} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={editingTutor.fullName}
                  onChange={(e) =>
                    setEditingTutor({
                      ...editingTutor,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editingTutor.email}
                    onChange={(e) =>
                      setEditingTutor({
                        ...editingTutor,
                        email: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={editingTutor.phone || ""}
                    onChange={(e) =>
                      setEditingTutor({
                        ...editingTutor,
                        phone: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Khu vực
                  </label>
                  <select
                    value={editingTutor.location}
                    onChange={(e) =>
                      setEditingTutor({
                        ...editingTutor,
                        location: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Học phí (VNĐ/giờ)
                  </label>
                  <input
                    type="number"
                    value={editingTutor.hourlyRate}
                    onChange={(e) =>
                      setEditingTutor({
                        ...editingTutor,
                        hourlyRate: Number(e.target.value),
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Trình độ học vấn
                </label>
                <input
                  type="text"
                  value={editingTutor.education || ""}
                  onChange={(e) =>
                    setEditingTutor({
                      ...editingTutor,
                      education: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Trạng thái duyệt
                </label>
                <select
                  value={editingTutor.isVerified ? "approved" : "pending"}
                  onChange={(e) =>
                    setEditingTutor({
                      ...editingTutor,
                      isVerified: e.target.value === "approved",
                      status: e.target.value as TutorStatus,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="approved">
                    Đã phê duyệt (Hiển thị công khai)
                  </option>
                  <option value="pending">Chờ phê duyệt</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Tiểu sử / Giới thiệu
                </label>
                <textarea
                  rows={3}
                  value={editingTutor.bio}
                  onChange={(e) =>
                    setEditingTutor({ ...editingTutor, bio: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTutor(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                >
                  Hủy
                </button>
                <Button type="submit">Lưu thay đổi</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TẠO / SỬA LỚP HỌC */}
      {/* ========================================================================= */}
      {(isCreatingLesson || editingLesson) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">
                {isCreatingLesson ? "Thêm lớp học mới" : "Cập nhật lớp học"}
              </h3>
              <button
                onClick={() => {
                  setIsCreatingLesson(false);
                  setEditingLesson(null);
                }}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Tên học sinh *
                  </label>
                  <input
                    type="text"
                    required
                    value={lessonFormData.studentName}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        studentName: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Số điện thoại học sinh
                  </label>
                  <input
                    type="tel"
                    value={lessonFormData.studentPhone}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        studentPhone: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Gia sư phụ trách *
                  </label>
                  <select
                    value={lessonFormData.tutorId}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        tutorId: e.target.value,
                      })
                    }
                    required
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Chọn gia sư --</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.location} - {t.subjects.join(", ")})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Môn học *
                  </label>
                  <select
                    value={lessonFormData.subject}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        subject: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Ngày học *
                  </label>
                  <input
                    type="date"
                    required
                    value={lessonFormData.preferredDate}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        preferredDate: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Giờ học *
                  </label>
                  <input
                    type="time"
                    required
                    value={lessonFormData.preferredTime}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        preferredTime: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Địa điểm / Hình thức
                  </label>
                  <input
                    type="text"
                    value={lessonFormData.location}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        location: e.target.value,
                      })
                    }
                    placeholder="Ví dụ: Cầu Giấy, Hà Nội hoặc Online"
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Học phí (VNĐ / buổi)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={lessonFormData.hourlyRate}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        hourlyRate: Number(e.target.value),
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Trạng thái lớp học
                </label>
                <select
                  value={lessonFormData.status}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      status: e.target.value as LessonStatus,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="pending">Chờ xử lý (Pending)</option>
                  <option value="accepted">
                    Đã duyệt / Đang học (Accepted)
                  </option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                  <option value="cancelled">Đã hủy (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Ghi chú lớp học
                </label>
                <textarea
                  rows={2}
                  value={lessonFormData.notes}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Ghi chú nội dung trọng tâm hoặc yêu cầu từ phụ huynh..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingLesson(false);
                    setEditingLesson(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                >
                  Hủy
                </button>
                <Button type="submit">
                  {isCreatingLesson ? "Tạo Lớp Học" : "Lưu Thay Đổi"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
