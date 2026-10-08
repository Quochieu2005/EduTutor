"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEduClerk, useEduUser } from "@/lib/auth";
import { AUTH_SESSION_EVENT, clearAuthSession, getAuthSession, isAuthSignOutInProgress, saveAuthSession, type ActorType } from "@/lib/auth-session";
import { edututorApi } from "@/lib/edututor-api";
import type { LessonSession, PostedClassWithApplications, TutorAvailability } from "@/lib/edututor-api";
import { toast } from "@/lib/toast";
import { API_DATA_CHANGED_EVENT, getLessons, proposeLessonSchedule, updateLessonStatus } from "@/lib/api";
import type { LessonRequest, ScheduleProposalPayload } from "@/lib/types";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TutorPortal } from "@/components/tutor/TutorPortal";
import { ActualScheduleCalendar, LessonCard, WeeklyTimetable } from "@/components/lessons/LessonCard";
import { ScheduleProposalForm } from "@/components/lessons/ScheduleProposalForm";
import { AppstoreOutlined, BookOutlined, CalendarOutlined, LockOutlined, LogoutOutlined, SettingOutlined, TableOutlined, UserOutlined } from "@ant-design/icons";
import {
  PORTAL_STORE_EVENT,
  buildDemoTeachingSchedule,
  getEnrollmentRequests,
  getTutorApplicationForUser,
  type EnrollmentRequest,
  type TutorApplication,
} from "@/lib/portal-store";

const dayLabels: Record<number, string> = {
  2: "T2",
  3: "T3",
  4: "T4",
  5: "T5",
  6: "T6",
  7: "T7",
  8: "CN",
};

const enrollmentStatusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã đăng ký",
  rejected: "Bị từ chối",
};

const tutorStatusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
};

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useEduUser();
  const { signOut } = useEduClerk();
  const router = useRouter();
  const [application, setApplication] = useState<TutorApplication | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<EnrollmentRequest[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // The server cannot read browser session storage. Start from the same value
  // on server and client, then resolve the signed actor in the effect below;
  // otherwise a tutor session causes an SSR hydration mismatch.
  const [actorType, setActorType] = useState<ActorType>("student");
  const [authResolved, setAuthResolved] = useState(false);
  const [apiAccount, setApiAccount] = useState<Record<string, unknown>>({});
  const [profileForm, setProfileForm] = useState({ displayName: "", username: "", phone: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [tutorRequests, setTutorRequests] = useState<LessonRequest[]>([]);
  const [tutorRequestsLoading, setTutorRequestsLoading] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<TutorAvailability["slots"]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [userTab, setUserTab] = useState<"overview" | "profile" | "applications" | "lessons" | "schedule" | "timetable" | "security">("overview");
  const [learnerRequests, setLearnerRequests] = useState<LessonRequest[]>([]);
  const [learnerSessions, setLearnerSessions] = useState<LessonSession[]>([]);
  const [learnerRequestsLoading, setLearnerRequestsLoading] = useState(false);
  const [schedulingRequest, setSchedulingRequest] = useState<LessonRequest | null>(null);
  const [postedClasses, setPostedClasses] = useState<PostedClassWithApplications[]>([]);
  const [postedClassesLoading, setPostedClassesLoading] = useState(false);
  const [decidingApplicationId, setDecidingApplicationId] = useState<number | null>(null);

  useEffect(() => {
    const syncActor = () => {
      const session = getAuthSession();
      setActorType(session?.actorType ?? "student");
      setApiAccount(session?.account ?? {});
      setAuthResolved(true);
    };
    syncActor();
    window.addEventListener(AUTH_SESSION_EVENT, syncActor);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, syncActor);
  }, []);

  useEffect(() => {
    if (!authResolved || !isSignedIn || !["user", "student", "parent"].includes(actorType) || getAuthSession()?.actorType !== actorType) return;
    let cancelled = false;
    edututorApi.accountProfile().then((profile) => {
      if (cancelled) return;
      const detail = profile.student ?? profile.parent ?? {};
      setProfileForm({
        displayName: String(profile.account?.display_name ?? detail.name ?? ""),
        username: String(profile.account?.username ?? ""),
        phone: String(detail.phone ?? profile.account?.phone ?? ""),
      });
    }).catch(() => toast.error("Không tải được hồ sơ tài khoản."));
    return () => { cancelled = true; };
  }, [actorType, authResolved, isSignedIn]);

  const refreshPostedClasses = useCallback(async () => {
    if (!authResolved || !isSignedIn || !["student", "parent"].includes(actorType) || getAuthSession()?.actorType !== actorType) return;
    setPostedClassesLoading(true);
    try {
      setPostedClasses(await edututorApi.myPostedClassApplications());
    } catch {
      setPostedClasses([]);
    } finally {
      setPostedClassesLoading(false);
    }
  }, [actorType, authResolved, isSignedIn]);

  useEffect(() => { void refreshPostedClasses(); }, [refreshPostedClasses]);

  const refreshLearnerData = useCallback(async (showLoading = false) => {
    if (!authResolved || !isSignedIn || !["student", "parent"].includes(actorType) || getAuthSession()?.actorType !== actorType) return [];
    if (showLoading) setLearnerRequestsLoading(true);
    try {
      const [records, sessions] = await Promise.all([getLessons(), edututorApi.lessonSessions()]);
      setLearnerRequests(records);
      setLearnerSessions(sessions);
      return records;
    } catch {
      if (showLoading) { setLearnerRequests([]); setLearnerSessions([]); }
      return [];
    } finally {
      if (showLoading) setLearnerRequestsLoading(false);
    }
  }, [actorType, authResolved, isSignedIn]);

  useEffect(() => {
    void refreshLearnerData(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshLearnerData(false);
        void refreshPostedClasses();
      }
    };
    // Focus/visibility events refresh immediately. Keep the background poll
    // deliberately light so many signed-in users do not overload the API.
    const timer = window.setInterval(refreshWhenVisible, 20_000);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener(API_DATA_CHANGED_EVENT, refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener(API_DATA_CHANGED_EVENT, refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshLearnerData, refreshPostedClasses]);

  useEffect(() => {
    if (!authResolved || !isSignedIn || actorType !== "tutor" || getAuthSession()?.actorType !== "tutor") return;
    let cancelled = false;
    setTutorRequestsLoading(true);
    setAvailabilityLoading(true);
    Promise.all([getLessons(), edututorApi.myTutorAvailability()]).then(([records, availability]) => {
      if (!cancelled) {
        setTutorRequests(records);
        setAvailabilitySlots(availability.slots);
      }
    }).catch(() => {
      if (!cancelled) {
        setTutorRequests([]);
        toast.error("Không tải được yêu cầu hoặc lịch có thể dạy của gia sư.");
      }
    }).finally(() => {
      if (!cancelled) {
        setTutorRequestsLoading(false);
        setAvailabilityLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [actorType, authResolved, isSignedIn]);

  function toggleAvailability(weekday: number, period: "morning" | "afternoon" | "evening") {
    setAvailabilitySlots((current) => {
      const exists = current.some((slot) => slot.weekday === weekday && slot.period === period);
      return exists
        ? current.filter((slot) => !(slot.weekday === weekday && slot.period === period))
        : [...current, { weekday, period }];
    });
  }

  async function saveAvailability() {
    setAvailabilitySaving(true);
    try {
      const result = await edututorApi.updateMyTutorAvailability(availabilitySlots);
      setAvailabilitySlots(result.slots);
      toast.success("Đã cập nhật lịch có thể dạy. Lịch mới đã hiển thị trên hồ sơ công khai.");
    } catch {
      toast.error("Không thể lưu lịch có thể dạy. Vui lòng thử lại.");
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const payload = new FormData();
      payload.append("display_name", profileForm.displayName.trim());
      payload.append("username", profileForm.username.trim());
      payload.append("phone", profileForm.phone.trim());
      if (avatarFile) payload.append("avatar", avatarFile);
      const profile = await edututorApi.updateAccountProfile(payload);
      const session = getAuthSession();
      const detail = profile.student ?? profile.parent ?? {};
      const nextAccount = { ...(session?.account ?? {}), ...(profile.account ?? {}), name: detail.name ?? profileForm.displayName, phone: detail.phone ?? profileForm.phone, avatar: detail.avatar ?? profile.account?.avatar };
      if (session) saveAuthSession({ ...session, account: nextAccount, source: "local" });
      setApiAccount(nextAccount);
      setAvatarFile(null);
      setAvatarPreview("");
      toast.success("Đã cập nhật hồ sơ.");
    } catch (error: unknown) {
      const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const detail = typeof data?.detail === "string" ? data.detail : Object.values(data ?? {}).flat().find((value) => typeof value === "string");
      toast.error(typeof detail === "string" ? detail : "Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    try {
      const result = await edututorApi.changeAccountPassword(passwordForm);
      toast.success(result.message || "Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
      clearAuthSession();
      router.replace("/login");
    } catch (error: unknown) {
      const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const detail = typeof data?.detail === "string" ? data.detail : Object.values(data ?? {}).flat().find((value) => typeof value === "string");
      toast.error(typeof detail === "string" ? detail : "Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function updateLearnerRequest(id: string, status: "accepted" | "declined" | "cancelled") {
    try {
      const updated = await updateLessonStatus(id, status);
      setLearnerRequests((current) => current.map((item) => item.id === id ? updated : item));
      if (status === "declined") {
        setSchedulingRequest(updated);
        toast.info("Đã từ chối lịch cũ. Hãy chọn lịch mới và ghi lý do gửi gia sư.");
      } else if (status === "accepted") {
        setSchedulingRequest(null);
        await refreshLearnerData(false);
        toast.success("Đã đồng ý lịch. Các buổi học trong một tháng đã được tạo.");
      } else {
        toast.success("Đã hủy đề xuất học.");
      }
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" && detail.trim() ? detail : "Không thể cập nhật yêu cầu học. Vui lòng thử lại.");
    }
  }

  async function proposeLearnerSchedule(id: string, payload: ScheduleProposalPayload) {
    try {
      const updated = await proposeLessonSchedule(id, payload);
      setLearnerRequests((current) => current.map((item) => item.id === id ? updated : item));
      setSchedulingRequest(null);
      await refreshLearnerData(false);
      toast.success(payload.note ? "Đã gửi lại lịch mới và lý do tới gia sư." : "Đã gửi đề xuất lịch học tới gia sư.");
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const message = typeof detail === "string" && detail.trim() ? detail : "Không thể gửi lịch học. Hãy kiểm tra ngày, giờ và thông tin buổi học.";
      toast.error(message);
      throw new Error(message);
    }
  }

  async function decideClassApplication(applicationId: number, status: "accepted" | "rejected") {
    setDecidingApplicationId(applicationId);
    try {
      const updatedJob = await edututorApi.decidePostedClassApplication(applicationId, status);
      setPostedClasses((current) => current.map((job) => job.slug === updatedJob.slug ? updatedJob : job));
      if (status === "accepted") {
        await refreshLearnerData(false);
        toast.success("Đã chọn gia sư. Hãy chuyển sang bước chốt lịch học.");
      } else {
        toast.success("Đã từ chối đề nghị dạy.");
      }
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Không thể xử lý đề nghị dạy.");
    } finally {
      setDecidingApplicationId(null);
    }
  }

  async function openClassBoardSchedule(requestId: number) {
    const request = learnerRequests.find((item) => item.id === String(requestId))
      ?? (await refreshLearnerData(false)).find((item) => item.id === String(requestId));
    setUserTab("lessons");
    if (request) {
      setSchedulingRequest(request);
    } else {
      toast.error("Chưa tải được yêu cầu chốt lịch. Vui lòng thử lại.");
    }
  }

  useEffect(() => {
    // useSyncExternalStore receives an empty server snapshot on the first
    // client render. Do not redirect during that short hydration window when
    // a valid local EduTutor session is already present.
    if (!isAuthSignOutInProgress() && authResolved && isLoaded && !isSignedIn && !getAuthSession()) {
      router.replace("/login");
    }
  }, [authResolved, isLoaded, isSignedIn, router]);

  const refresh = useCallback(() => {
    if (!user) return;
    const nextApplication = getTutorApplicationForUser(user.id) ?? null;
    setApplication(nextApplication);
    setIncomingRequests(
      nextApplication?.status === "approved" && nextApplication.assignedTutorId
        ? getEnrollmentRequests().filter(
            (request) => request.tutorId === nextApplication.assignedTutorId,
          )
        : [],
    );
  }, [user]);

  useEffect(() => {
    const initialLoad = setTimeout(refresh, 0);
    window.addEventListener(PORTAL_STORE_EVENT, refresh);
    return () => {
      clearTimeout(initialLoad);
      window.removeEventListener(PORTAL_STORE_EVENT, refresh);
    };
  }, [refresh]);


  const schedule = useMemo(
    () => (application?.status === "approved" ? buildDemoTeachingSchedule(application) : []),
    [application],
  );

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== "Delete account") return;
    setDeleteError(null);
    try {
      await user.delete();
      await signOut();
      router.replace("/");
    } catch {
      setDeleteError("Không thể xóa tài khoản lúc này. API hiện chưa hỗ trợ thao tác này.");
    }
  };

  const profileName = String(apiAccount.name ?? apiAccount.display_name ?? user?.fullName ?? "Thành viên EduTutor");
  const profileEmail = String(apiAccount.email ?? user?.primaryEmailAddress?.emailAddress ?? "");
  const profileAvatar = String(apiAccount.avatar ?? user?.imageUrl ?? "");
  const roleLabel = actorType === "admin" ? "Quản trị viên" : actorType === "tutor" ? "Gia sư" : actorType === "parent" ? "Phụ huynh" : actorType === "student" ? "Học viên" : "Người dùng";
  const profileTitle = actorType === "admin" ? "Hồ sơ quản trị viên" : actorType === "tutor" ? "Hồ sơ gia sư" : actorType === "parent" ? "Hồ sơ phụ huynh" : actorType === "student" ? "Hồ sơ học viên" : "Hồ sơ tài khoản";
  const isLearner = actorType === "student" || actorType === "parent";
  const hasAccountSidebar = actorType === "user" || isLearner;

  const accountNavigation = [
    { key: "overview" as const, label: "Tổng quan", icon: <AppstoreOutlined /> },
    { key: "profile" as const, label: "Cập nhật hồ sơ", icon: <UserOutlined /> },
    ...(isLearner ? [
      { key: "applications" as const, label: "Gia sư ứng tuyển", icon: <BookOutlined /> },
      { key: "lessons" as const, label: "Chốt lịch & buổi học", icon: <CalendarOutlined /> },
      { key: "schedule" as const, label: "Lịch học", icon: <CalendarOutlined /> },
      { key: "timetable" as const, label: "Thời khóa biểu", icon: <TableOutlined /> },
    ] : []),
    { key: "security" as const, label: "Bảo mật", icon: <LockOutlined /> },
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-32 w-full bg-white rounded-2xl border border-gray-200 shadow-xs p-6 animate-pulse" />
          <div className="h-48 w-full bg-white rounded-2xl border border-gray-200 shadow-xs p-6 animate-pulse" />
        </main>
        <Footer />
      </div>
    );
  }

  if (actorType === "tutor") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        <Header />
        <TutorPortal />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className={hasAccountSidebar ? "grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]" : "space-y-6"}>
          {hasAccountSidebar && <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:sticky lg:top-24">
            <div className="flex items-center gap-3 border-b border-slate-100 px-2 pb-4">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-blue-600 font-bold text-white">
                {profileAvatar ? <Image src={profileAvatar} alt="Ảnh đại diện" width={44} height={44} className="h-full w-full object-cover" /> : (profileName[0] || "U")}
              </div>
              <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{profileName}</p><p className="truncate text-xs text-slate-500">{roleLabel}</p></div>
            </div>
            <nav className="mt-3 space-y-1" aria-label="Quản lý tài khoản">
              {accountNavigation.map((item) => <button key={item.key} type="button" onClick={() => setUserTab(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${userTab === item.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}><span>{item.icon}</span>{item.label}</button>)}
            </nav>
            <button type="button" onClick={() => void signOut().then(() => router.replace("/"))} className="mt-4 flex w-full items-center gap-3 border-t border-slate-100 px-3 pt-4 text-sm font-semibold text-slate-600 hover:text-rose-600"><LogoutOutlined />Đăng xuất</button>
          </aside>}
          <div className="min-w-0 space-y-6">

        {(!hasAccountSidebar || userTab === "overview") && <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Tài khoản {roleLabel}</p>
          <h1 className="text-3xl font-bold mt-1">{profileTitle}</h1>
        </div>}

        {(!hasAccountSidebar || userTab === "overview") && <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {profileAvatar ? <Image src={profileAvatar} alt="Ảnh đại diện" width={64} height={64} className="w-full h-full object-cover" /> : (profileName[0] || "U")}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{profileName}</h2>
            <p className="text-sm text-gray-500 break-all">{profileEmail}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{roleLabel}</span>
              {String(actorType) !== "tutor" && actorType !== "admin" && application && application.status !== "rejected" && (
                <span
                  className={`px-2.5 py-1 rounded-full border ${
                    application.status === "approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  Hồ sơ gia sư: {tutorStatusLabel[application.status]}
                </span>
              )}
            </div>
          </div>
        </section>}

        {isLearner && userTab === "applications" && <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-bold">Lớp đã đăng & gia sư ứng tuyển</h2><p className="mt-1 text-xs text-gray-500">Xem người đã đề nghị dạy bài đăng của bạn và chọn gia sư phù hợp.</p></div>
            <Link href="/classes" className="text-sm font-bold text-blue-600 hover:text-blue-700">Xem danh sách lớp</Link>
          </div>
          {postedClassesLoading ? <p className="py-8 text-center text-sm text-slate-500">Đang tải danh sách ứng tuyển...</p> : postedClasses.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-7 text-center text-sm text-slate-500">Bạn chưa đăng yêu cầu tìm gia sư nào.</p> : <div className="mt-5 space-y-4">{postedClasses.map((job) => (
            <article key={job.slug} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{job.title}</h3><p className="mt-1 text-xs text-slate-500">{job.subject} · {job.applications.length} gia sư ứng tuyển</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${job.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{job.status === "open" ? "Đang tuyển" : "Đã chọn gia sư"}</span></div>
              {job.applications.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Chưa có gia sư đề nghị dạy lớp này.</p> : <div className="mt-4 grid gap-3">{job.applications.map((application) => (
                <div key={application.id} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div className="flex min-w-0 gap-3">{application.tutor.avatar ? <Image src={application.tutor.avatar} alt={application.tutor.name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">{application.tutor.name.charAt(0)}</div>}<div className="min-w-0"><Link href={`/tutors/${application.tutor.slug}`} className="font-bold text-slate-900 hover:text-blue-600">{application.tutor.name}</Link><p className="mt-1 text-xs text-slate-500">{application.tutor.headline || `${application.tutor.experience_years} năm kinh nghiệm`} · {application.tutor.rating_avg}/5 ({application.tutor.rating_count} đánh giá)</p><p className="mt-1 text-xs text-slate-500">{application.tutor.phone || application.tutor.email}</p></div></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${application.status === "accepted" ? "bg-emerald-100 text-emerald-700" : application.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{application.status === "accepted" ? "Đã chấp nhận" : application.status === "rejected" ? "Đã từ chối" : "Chờ phản hồi"}</span></div>
                  <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-700"><strong>Lời nhắn:</strong> {application.cover_letter || "Gia sư chưa để lại lời nhắn."}</p>
                  {application.status === "pending" && job.status === "open" && <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" disabled={decidingApplicationId !== null} onClick={() => void decideClassApplication(application.id, "rejected")} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">Từ chối</button><button type="button" disabled={decidingApplicationId !== null} onClick={() => void decideClassApplication(application.id, "accepted")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{decidingApplicationId === application.id ? "Đang xử lý..." : "Chấp nhận gia sư"}</button></div>}
                </div>
              ))}</div>}
              {job.status === "closed" && job.learning_request_id && <div className="mt-4 flex justify-end"><button type="button" onClick={() => void openClassBoardSchedule(job.learning_request_id!)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Chốt lịch học với gia sư</button></div>}
            </article>
          ))}</div>}
        </section>}

        {hasAccountSidebar && userTab === "profile" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold">Cập nhật hồ sơ</h2>
              <p className="mt-1 text-xs text-gray-500">Thông tin này sẽ được tự động điền khi bạn đăng ký lớp hoặc gửi yêu cầu mời gia sư.</p>
            </div>
            <form onSubmit={handleProfileSave} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 sm:col-span-2">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-xl font-bold text-white">
                  {avatarPreview || profileAvatar ? <Image src={avatarPreview || profileAvatar} alt="Ảnh đại diện" width={80} height={80} unoptimized={Boolean(avatarPreview)} className="h-full w-full object-cover" /> : (profileName[0] || "U")}
                </div>
                <div>
                  <label className="inline-flex cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Chọn ảnh đại diện<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Ảnh đại diện không được vượt quá 5 MB.");
                      event.target.value = "";
                      return;
                    }
                    setAvatarFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setAvatarPreview(typeof reader.result === "string" ? reader.result : "");
                    reader.readAsDataURL(file);
                  }} /></label>
                  <p className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP hoặc GIF · tối đa 5 MB.</p>
                  {avatarFile && <p className="mt-1 max-w-xs truncate text-xs font-medium text-blue-600">{avatarFile.name}</p>}
                </div>
              </div>
              <label className="text-sm font-semibold">Họ và tên
                <input required value={profileForm.displayName} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" placeholder="Nhập họ và tên" />
              </label>
              <label className="text-sm font-semibold">Tên đăng nhập
                <input required minLength={3} pattern="[A-Za-z0-9_]+" value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" placeholder="Tên đăng nhập" />
              </label>
              <label className="text-sm font-semibold">Email
                <input readOnly value={profileEmail} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-normal text-slate-500" />
              </label>
              <label className="text-sm font-semibold">Số điện thoại
                <input required type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" placeholder="Ví dụ: 0912345678" />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <button disabled={profileSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{profileSaving ? "Đang lưu..." : "Lưu hồ sơ"}</button>
              </div>
            </form>
          </section>
        )}

        {isLearner && userTab === "lessons" && <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="border-b border-gray-100 pb-4"><h2 className="text-xl font-bold">Chốt lịch & buổi học</h2><p className="mt-1 text-xs text-gray-500">Theo dõi và phản hồi các lịch học đang thương lượng.</p></div>
          {schedulingRequest && <ScheduleProposalForm lesson={schedulingRequest} counterpartName={schedulingRequest.tutorName} proposalRole={schedulingRequest.status === "declined" ? "learner-counter" : "learner"} onCancel={() => setSchedulingRequest(null)} onSubmit={(payload) => proposeLearnerSchedule(schedulingRequest.id, payload)} />}
          {!schedulingRequest && learnerRequestsLoading ? <p className="py-8 text-center text-sm text-slate-500">Đang tải yêu cầu học...</p> : !schedulingRequest ? learnerRequests.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Chưa có yêu cầu mời dạy nào. Bạn có thể tìm gia sư và gửi lời mời từ hồ sơ của họ.</p> : <div className="space-y-4">{learnerRequests.map((request) => <LessonCard key={request.id} lesson={request} userRole={actorType} onAccept={(id) => void updateLearnerRequest(id, "accepted")} onReject={(id) => void updateLearnerRequest(id, "declined")} onCancel={(id) => void updateLearnerRequest(id, "cancelled")} onSchedule={setSchedulingRequest} />)}</div> : null}
        </section>}

        {isLearner && userTab === "schedule" && <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="border-b border-gray-100 pb-4"><h2 className="text-xl font-bold">Lịch học</h2><p className="mt-1 text-xs text-gray-500">Các buổi học đã được gia sư và bạn xác nhận trong một tháng.</p></div>
          {learnerRequestsLoading ? <p className="py-8 text-center text-sm text-slate-500">Đang tải lịch học...</p> : <ActualScheduleCalendar sessions={learnerSessions} />}
        </section>}

        {isLearner && userTab === "timetable" && <section className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs"><h2 className="text-xl font-bold">Thời khóa biểu</h2><p className="mt-1 text-xs text-gray-500">Toàn bộ lịch học từ Thứ 2 đến Thứ 7, chia theo sáng, trưa, chiều và tối.</p></div>
          {learnerRequestsLoading ? <p className="rounded-2xl bg-white py-8 text-center text-sm text-slate-500">Đang tải thời khóa biểu...</p> : <WeeklyTimetable sessions={learnerSessions} role="learner" />}
        </section>}

        {String(actorType) === "tutor" && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold">Hồ sơ gia sư</h2>
              <p className="text-xs text-gray-500 mt-1">Thông tin giảng dạy được quản lý và xác minh bởi EduTutor.</p>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-slate-50 p-4"><dt className="text-gray-500">Trạng thái</dt><dd className="mt-1 font-bold text-emerald-700">{apiAccount.status === "active" ? "Đang hoạt động" : String(apiAccount.status ?? "Chưa cập nhật")}</dd></div>
              <div className="rounded-xl bg-slate-50 p-4"><dt className="text-gray-500">Hình thức dạy</dt><dd className="mt-1 font-bold">{apiAccount.teaching_mode === "both" ? "Online và trực tiếp" : apiAccount.teaching_mode === "online" ? "Online" : apiAccount.teaching_mode === "offline" ? "Trực tiếp" : "Chưa cập nhật"}</dd></div>
              <div className="rounded-xl bg-slate-50 p-4"><dt className="text-gray-500">Kinh nghiệm</dt><dd className="mt-1 font-bold">{String(apiAccount.experience_years ?? 0)} năm</dd></div>
              <div className="rounded-xl bg-slate-50 p-4"><dt className="text-gray-500">Đánh giá</dt><dd className="mt-1 font-bold">{String(apiAccount.rating_avg ?? 0)} / 5 ({String(apiAccount.rating_count ?? 0)} lượt)</dd></div>
            </dl>
            <div className="flex flex-wrap gap-3"><Link href="/lessons" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Lịch dạy và yêu cầu</Link><Link href="/classes" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50">Danh sách lớp</Link></div>
            <div className="border-t border-slate-100 pt-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-bold">Lịch có thể dạy</h3><p className="mt-1 text-xs text-slate-500">Chọn các buổi bạn còn trống. Lịch này được hiển thị trực tiếp trên hồ sơ gia sư.</p></div>
                <button type="button" onClick={() => void saveAvailability()} disabled={availabilityLoading || availabilitySaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                  {availabilitySaving ? "Đang lưu..." : "Lưu lịch có thể dạy"}
                </button>
              </div>
              {availabilityLoading ? <p className="py-6 text-center text-sm text-slate-500">Đang tải lịch...</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-center text-xs">
                    <thead><tr><th className="border border-slate-200 bg-slate-50 p-2 text-left">Buổi</th>{[0, 1, 2, 3, 4, 5, 6].map((day) => <th key={day} className="border border-slate-200 bg-slate-50 p-2">{dayLabels[day + 2]}</th>)}</tr></thead>
                    <tbody>{([ ["morning", "Sáng"], ["afternoon", "Chiều"], ["evening", "Tối"] ] as const).map(([period, label]) => (
                      <tr key={period}><th className="border border-slate-200 bg-slate-50 p-2 text-left">{label}</th>{[0, 1, 2, 3, 4, 5, 6].map((day) => {
                        const selected = availabilitySlots.some((slot) => slot.weekday === day && slot.period === period);
                        return <td key={day} className="border border-slate-200 p-1"><button type="button" aria-pressed={selected} onClick={() => toggleAvailability(day, period)} className={`h-10 w-full rounded-lg font-bold transition-colors ${selected ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-700"}`}>{selected ? "Có thể dạy" : "Bận"}</button></td>;
                      })}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><h3 className="font-bold">Yêu cầu mời dạy gửi đến bạn</h3><p className="mt-1 text-xs text-slate-500">Yêu cầu từ học viên/phụ huynh được lấy trực tiếp từ API.</p></div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{tutorRequests.length}</span>
              </div>
              {tutorRequestsLoading ? <p className="py-5 text-center text-sm text-slate-500">Đang tải yêu cầu...</p> : tutorRequests.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Chưa có yêu cầu mời dạy nào gửi đến tài khoản này.</p> : <div className="space-y-3">{tutorRequests.slice(0, 5).map((request) => <article key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-slate-900">{request.studentName} — {request.subject}</h4><p className="mt-1 text-xs text-slate-500">{request.studentPhone || "Chưa có số điện thoại"}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{request.status === "pending" ? "Chờ phản hồi" : request.status}</span></div>{request.message && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">{request.message}</p>}</article>)}</div>}
            </div>
          </section>
        )}

        {actorType === "admin" && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
            <div className="border-b border-gray-100 pb-4"><h2 className="text-xl font-bold">Tài khoản quản trị</h2><p className="text-xs text-gray-500 mt-1">Bạn đang đăng nhập giao diện người dùng bằng tài khoản Admin.</p></div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"><div className="rounded-xl bg-slate-50 p-4"><dt className="text-gray-500">Vai trò</dt><dd className="mt-1 font-bold">{apiAccount.role === "super_admin" ? "Super Admin" : "Admin"}</dd></div><div className="rounded-xl bg-slate-50 p-4"><dt className="text-gray-500">Trạng thái</dt><dd className="mt-1 font-bold text-emerald-700">{apiAccount.status === "active" ? "Đang hoạt động" : String(apiAccount.status ?? "Chưa cập nhật")}</dd></div></dl>
            <Link href="/admin" className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Đi tới trang quản trị</Link>
          </section>
        )}

        {isLearner && userTab === "overview" && application?.status === "approved" && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold">Hồ sơ và lịch dạy gia sư</h2>
                <p className="text-xs text-gray-500 mt-1">Lịch sáng–chiều từ Thứ 2 đến Chủ nhật.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-separate border-spacing-1 text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-gray-500">Buổi</th>
                    {[2, 3, 4, 5, 6, 7, 8].map((day) => (
                      <th key={day} className="p-2 bg-gray-50 rounded-lg">
                        {dayLabels[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["morning", "afternoon"] as const).map((period) => (
                    <tr key={period}>
                      <th className="p-2 text-left text-gray-600">
                        {period === "morning" ? "Sáng" : "Chiều"}
                      </th>
                      {[2, 3, 4, 5, 6, 7, 8].map((day) => {
                        const item = schedule.find(
                          (entry) => entry.day === day && entry.period === period,
                        );
                        return (
                          <td key={day} className="align-top p-1 h-28">
                            {item ? (
                              <div className="h-full rounded-lg bg-blue-50 border border-blue-100 p-2 space-y-1">
                                <strong className="block text-blue-800">{item.subject}</strong>
                                <span className="block text-gray-700">{item.grade}</span>
                                <span className="block text-gray-500">{item.time}</span>
                                <span className="block text-purple-700">
                                  {item.teachingMode === "online"
                                    ? "Online"
                                    : item.teachingMode === "offline"
                                      ? "Trực tiếp"
                                      : "Online & Trực tiếp"}
                                </span>
                                {item.address && (
                                  <span className="block text-gray-500">{item.address}</span>
                                )}
                              </div>
                            ) : (
                              <div className="h-full rounded-lg bg-gray-50 border border-dashed border-gray-200" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h3 className="font-bold">Yêu cầu từ người dùng</h3>
              {incomingRequests.length === 0 ? (
                <p className="text-xs text-gray-500">Chưa có yêu cầu mới.</p>
              ) : (
                incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <strong>{request.studentName}</strong>
                      <p className="text-gray-500 mt-0.5">
                        {request.classTitle} • PH: {request.parentPhone} • HV: {request.studentPhone}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        request.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : request.status === "rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {enrollmentStatusLabel[request.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {(!hasAccountSidebar || userTab === "security") && <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold">Bảo mật & tài khoản</h2>
            <p className="text-xs text-gray-500 mt-1">Đăng nhập hiện tại được API EduTutor quản lý.</p>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <div><strong>Phương thức đăng nhập</strong><p className="text-xs text-gray-500 mt-1">Email và mật khẩu EduTutor.</p></div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">Đang hoạt động</span>
          </div>
          {hasAccountSidebar && <form onSubmit={handlePasswordChange} className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <h3 className="font-bold sm:col-span-2">Đổi mật khẩu</h3>
            <label className="text-sm font-semibold">Mật khẩu hiện tại<input required type="password" value={passwordForm.current_password} onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" /></label>
            <label className="text-sm font-semibold">Mật khẩu mới<input required type="password" minLength={8} value={passwordForm.new_password} onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" /></label>
            <label className="text-sm font-semibold">Xác nhận mật khẩu mới<input required type="password" minLength={8} value={passwordForm.confirm_password} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" /></label>
            <div className="flex items-end"><button disabled={passwordSaving} className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">{passwordSaving ? "Đang cập nhật..." : "Đổi mật khẩu"}</button></div>
          </form>}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <div><strong className="text-sm">Xóa tài khoản</strong><p className="text-xs text-gray-500 mt-1">Hành động này là vĩnh viễn và không thể hoàn tác.</p></div>
            <button type="button" onClick={() => setDeleteDialogOpen(true)} className="text-sm font-semibold text-rose-600 hover:text-rose-700 cursor-pointer">Xóa tài khoản</button>
          </div>
        </section>}
          </div>
        </div>
      </main>

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[80] bg-gray-950/50 p-4 flex items-center justify-center">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-5">
            <div><h2 id="delete-account-title" className="text-xl font-bold">Xóa tài khoản</h2><p className="text-sm text-gray-500 mt-1">Dữ liệu liên quan có thể được giữ lại theo chính sách hệ thống.</p><p className="text-sm text-rose-600 mt-2">Hành động này là vĩnh viễn và không thể hoàn tác.</p></div>
            <label className="block text-sm font-semibold">Nhập <code>Delete account</code> để tiếp tục.
              <input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Delete account" className="mt-2 w-full p-3 rounded-xl border border-gray-200 font-normal focus:outline-hidden focus:border-rose-400" />
            </label>
            {deleteError && <p className="text-xs text-rose-600">{deleteError}</p>}
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setDeleteDialogOpen(false)} className="px-4 py-2.5 text-sm font-semibold">Hủy</button><button type="button" disabled={deleteConfirmation !== "Delete account"} onClick={handleDeleteAccount} className="px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">Xóa tài khoản</button></div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
