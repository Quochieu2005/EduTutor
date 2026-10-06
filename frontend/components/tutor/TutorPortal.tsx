"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOutlined, CalendarOutlined, ClockCircleOutlined, KeyOutlined,
  LogoutOutlined, ProfileOutlined, SafetyCertificateOutlined, TableOutlined,
} from "@ant-design/icons";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/lib/auth-session";
import { edututorApi, type LessonSession, type Subject, type TutorAvailability, type TutorQuestion, type TutorSubjectChangeRequest } from "@/lib/edututor-api";
import { API_DATA_CHANGED_EVENT, apiErrorMessage, getLessons } from "@/lib/api";
import type { LessonRequest, ScheduleProposalPayload } from "@/lib/types";
import { toast } from "@/lib/toast";
import { ScheduleProposalForm } from "@/components/lessons/ScheduleProposalForm";
import { WeeklyTimetable } from "@/components/lessons/LessonCard";

type PortalTab = "overview" | "profile" | "availability" | "subjects" | "lessons" | "schedule" | "timetable" | "security";
type TutorProfile = {
  id: number; slug: string; name: string; email: string; phone: string | null; avatar: string | null;
  birth_year: number | null; gender: "male" | "female" | "other" | null; hometown: string | null;
  voice: string | null; headline: string | null; bio: string | null; education_level: string | null;
  major: string | null; institution: string | null; experience_years: number; hourly_rate_min: number | null;
  hourly_rate_max: number | null; teaching_mode: "online" | "offline" | "both"; is_verified: boolean;
  status: string; rating_avg: number; rating_count: number; must_change_password: boolean;
  subjects: Array<{ id: number; slug: string; name: string; level: string | null; price_per_hour: number | null }>;
};

const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const periods: Array<{ value: "morning" | "afternoon" | "evening"; label: string }> = [
  { value: "morning", label: "Sáng" }, { value: "afternoon", label: "Chiều" }, { value: "evening", label: "Tối" },
];
const statusText: Record<string, string> = { pending: "Chờ Admin duyệt", approved: "Đã duyệt", rejected: "Không được duyệt" };
const lessonStatusText: Record<string, string> = {
  pending: "Chờ phản hồi",
  accepted: "Đã chấp nhận",
  declined: "Đã từ chối",
  completed: "Đã hoàn thành",
  no_show: "Vắng mặt",
};

const lessonPeriodText = { morning: "Sáng", afternoon: "Chiều", evening: "Tối" };

function contactPhone(lesson: LessonRequest) {
  if (lesson.studentPhone?.trim()) return lesson.studentPhone.trim();
  // Legacy invitations stored the contact details in the message.  Display
  // that number immediately while the API repairs the Student profile.
  return lesson.message.match(/Người liên hệ\s*:[^|]*?-\s*(\+?[0-9][0-9 () .-]{6,19})(?=\s*\||$)/i)?.[1].trim() ?? "";
}

function LessonScheduleDetails({ lesson }: { lesson: LessonRequest }) {
  const slots = lesson.weeklySlots ?? [];
  const dateText = lesson.preferredDate
    ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${lesson.preferredDate}T12:00:00`))
    : "Chưa chọn";
  const repeatUntil = lesson.recurrenceEndDate
    ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${lesson.recurrenceEndDate}T12:00:00`))
    : "Chưa xác định";
  const venue = lesson.mode === "online"
    ? lesson.meetingUrl || "Chưa có liên kết lớp trực tuyến"
    : lesson.location || "Chưa có địa chỉ học trực tiếp";
  return <div className="mt-3 grid gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-700 sm:grid-cols-2">
    <p><span className="font-semibold text-slate-900">Ngày bắt đầu:</span> {dateText}</p>
    <p><span className="font-semibold text-slate-900">Áp dụng đến:</span> {repeatUntil}</p>
    <p className="sm:col-span-2"><span className="font-semibold text-slate-900">Lịch đăng ký:</span> {slots.length ? slots.map((slot) => `${days[slot.weekday]} · ${lessonPeriodText[slot.period]} (${slot.startTime}–${slot.endTime})`).join("; ") : `${lesson.preferredTime || "Chưa có giờ"}${lesson.endTime ? `–${lesson.endTime}` : ""}`}</p>
    <p className="sm:col-span-2"><span className="font-semibold text-slate-900">Hình thức:</span> {lesson.mode === "online" ? "Học online" : lesson.mode === "offline" ? "Học trực tiếp" : "Chưa chọn"}</p>
    <p className="break-all sm:col-span-2"><span className="font-semibold text-slate-900">{lesson.mode === "online" ? "Liên kết lớp:" : "Địa điểm:"}</span> {venue}</p>
    {lesson.proposalNote && <p className="sm:col-span-2"><span className="font-semibold text-slate-900">{lesson.proposedBy === "student" ? "Lý do từ học viên:" : "Lý do từ gia sư:"}</span> {lesson.proposalNote}</p>}
  </div>;
}

function TutorSessionList({ sessions, saving, onAttendance }: { sessions: LessonSession[]; saving: boolean; onAttendance: (id: string, status: "completed" | "no_show") => void }) {
  return <div className="border-t border-slate-100 pt-6"><div><h3 className="text-base font-bold text-slate-900">Lịch dạy & điểm danh</h3><p className="mt-1 text-sm text-slate-500">Tất cả buổi học đã được hai bên xác nhận trong tháng.</p></div>{sessions.length ? <div className="mt-4 space-y-2">{sessions.map((session) => <article key={session.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-32"><p className="font-bold text-slate-900">{new Date(`${session.sessionDate}T12:00:00`).toLocaleDateString("vi-VN")}</p><p className="text-xs text-blue-700">{session.startTime}–{session.endTime}</p></div><div className="min-w-48 flex-1"><p className="font-semibold text-slate-900">{session.studentName} · {session.subject}</p><p className="text-xs text-slate-500">{session.mode === "online" ? "Online" : session.location || "Học trực tiếp"}</p></div>{session.status === "scheduled" ? <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => onAttendance(session.id, "completed")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Có học</button><button type="button" disabled={saving} onClick={() => onAttendance(session.id, "no_show")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-60">Vắng</button></div> : <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${session.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{session.status === "completed" ? "Đã điểm danh: có học" : "Đã điểm danh: vắng"}</span>}</article>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Chưa có buổi học nào được xác nhận.</p>}</div>;
}

function toForm(profile: TutorProfile) {
  return {
    name: profile.name, phone: profile.phone ?? "", birth_year: profile.birth_year?.toString() ?? "",
    gender: profile.gender ?? "", hometown: profile.hometown ?? "", voice: profile.voice ?? "",
    headline: profile.headline ?? "", bio: profile.bio ?? "", education_level: profile.education_level ?? "",
    major: profile.major ?? "", institution: profile.institution ?? "", experience_years: String(profile.experience_years ?? 0),
    hourly_rate_min: profile.hourly_rate_min?.toString() ?? "", hourly_rate_max: profile.hourly_rate_max?.toString() ?? "",
    teaching_mode: profile.teaching_mode,
  };
}

type ProfileFormContextValue = {
  form: Record<string, string>;
  setField: (name: string, value: string) => void;
};

const ProfileFormContext = createContext<ProfileFormContextValue | null>(null);

function Input({ label, name, type = "text", placeholder = "" }: { label: string; name: string; type?: string; placeholder?: string }) {
  const profileForm = useContext(ProfileFormContext);
  if (!profileForm) return null;

  return <label className="block text-sm font-semibold text-slate-700">{label}<input type={type} value={profileForm.form[name] ?? ""} onChange={(event) => profileForm.setField(name, event.target.value)} placeholder={placeholder} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>;
}

export function TutorPortal() {
  const router = useRouter();
  const [tab, setTab] = useState<PortalTab>("overview");
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [slots, setSlots] = useState<TutorAvailability["slots"]>([]);
  const [changes, setChanges] = useState<TutorSubjectChangeRequest[]>([]);
  const [catalogue, setCatalogue] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<LessonRequest[]>([]);
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [schedulingLesson, setSchedulingLesson] = useState<LessonRequest | null>(null);
  const [questions, setQuestions] = useState<TutorQuestion[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjectRequest, setSubjectRequest] = useState({ subject_id: "", level: "", price_per_hour: "", note: "" });
  const [password, setPassword] = useState({ current_password: "", new_password: "", confirm_password: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [nextProfile, availability, subjectPage, nextChanges, nextLessons, nextQuestions, nextSessions] = await Promise.all([
        edututorApi.tutorProfile(), edututorApi.myTutorAvailability(), edututorApi.subjects({ page_size: 200 }),
        edututorApi.tutorSubjectChangeRequests(), getLessons(), edututorApi.tutorQuestionInbox(), edututorApi.lessonSessions(),
      ]);
      const typed = nextProfile as TutorProfile;
      setProfile(typed);
      setForm(toForm(typed));
      setSlots(availability.slots);
      setCatalogue(subjectPage.results);
      setChanges(nextChanges);
      setLessons(nextLessons);
      setSessions(nextSessions);
      setQuestions(nextQuestions);
      const session = getAuthSession();
      if (session) saveAuthSession({ ...session, actorType: "tutor", account: { ...session.account, ...typed } });
    } catch {
      toast.error("Không thể tải hồ sơ gia sư. Hãy đăng nhập lại nếu phiên đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const refreshLessonData = async () => {
    try {
      const [nextLessons, nextSessions, nextChanges, nextQuestions] = await Promise.all([
        getLessons(),
        edututorApi.lessonSessions(),
        edututorApi.tutorSubjectChangeRequests(),
        edututorApi.tutorQuestionInbox(),
      ]);
      setLessons(nextLessons);
      setSessions(nextSessions);
      setChanges(nextChanges);
      setQuestions(nextQuestions);
    } catch {
      // Keep the last successful snapshot during a transient network error.
    }
  };

  useEffect(() => {
    void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshLessonData();
    };
    // Focus/visibility events refresh immediately. The slower safety poll keeps
    // data current without making every open tutor tab hit the API 7-8 times a minute.
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
  }, []);

  const pendingCount = changes.filter((item) => item.status === "pending").length;
  const toggleSlot = (weekday: number, period: TutorAvailability["slots"][number]["period"]) => {
    setSlots((current) => current.some((item) => item.weekday === weekday && item.period === period)
      ? current.filter((item) => item.weekday !== weekday || item.period !== period)
      : [...current, { weekday, period }]);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (key === "gender" && !value) continue;
        if (key === "birth_year" || key === "experience_years" || key.startsWith("hourly_rate_")) {
          if (value) payload.append(key, value);
        } else payload.append(key, value);
      }
      if (avatarFile) payload.append("avatar", avatarFile);
      const updated = await edututorApi.updateTutorProfile(payload) as TutorProfile;
      setProfile(updated); setForm(toForm(updated)); setAvatarFile(null);
      const session = getAuthSession();
      if (session) saveAuthSession({ ...session, account: { ...session.account, ...updated } });
      toast.success("Đã cập nhật hồ sơ gia sư.");
    } catch { toast.error("Không thể lưu hồ sơ. Kiểm tra lại các trường bắt buộc."); }
    finally { setSaving(false); }
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const updated = await edututorApi.updateMyTutorAvailability(slots);
      setSlots(updated.slots);
      toast.success("Đã lưu lịch có thể dạy và gửi thông báo tới Admin.");
    } catch { toast.error("Không thể lưu lịch có thể dạy."); }
    finally { setSaving(false); }
  };

  const sendSubjectChange = async (action: "add" | "remove", id?: number) => {
    const subjectId = id ?? Number(subjectRequest.subject_id);
    if (!subjectId) { toast.error("Vui lòng chọn môn học."); return; }
    setSaving(true);
    try {
      const change = await edututorApi.requestTutorSubjectChange({
        subject_id: subjectId, action, level: subjectRequest.level,
        price_per_hour: subjectRequest.price_per_hour ? Number(subjectRequest.price_per_hour) : null,
        note: subjectRequest.note,
      });
      setChanges((current) => [change, ...current]);
      if (action === "add") setSubjectRequest({ subject_id: "", level: "", price_per_hour: "", note: "" });
      toast.success("Đã gửi yêu cầu tới Admin để duyệt môn dạy.");
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error));
    }
    finally { setSaving(false); }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await edututorApi.changeTutorPassword(password);
      clearAuthSession();
      toast.success("Đổi mật khẩu thành công. Hãy đăng nhập lại.");
      router.replace("/login");
    } catch { toast.error("Không thể đổi mật khẩu. Kiểm tra mật khẩu hiện tại và xác nhận mật khẩu mới."); }
    finally { setSaving(false); }
  };

  const updateLesson = async (lesson: LessonRequest, status: "accepted" | "declined" | "completed" | "no_show") => {
    setSaving(true);
    try {
      const updated = await edututorApi.updateLessonStatus(lesson.id, status) as LessonRequest;
      setLessons((current) => current.map((item) => item.id === lesson.id ? updated : item));
      if (status === "declined") setSchedulingLesson(updated);
      await refreshLessonData();
      toast.success(status === "accepted" ? "Đã xác nhận yêu cầu học." : status === "declined" ? "Đã từ chối yêu cầu học." : "Đã cập nhật buổi học.");
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" && detail.trim()
        ? detail
        : "Không thể cập nhật yêu cầu học. Kiểm tra trạng thái và thử lại.");
    } finally { setSaving(false); }
  };

  const openScheduleManagement = () => {
    const target = lessons.find((item) => item.status === "declined");
    if (!target) {
      toast.info("Chỉ sau khi từ chối đề xuất hiện tại, bạn mới có thể gửi lịch rảnh khác cho học viên.");
      return;
    }
    setSchedulingLesson(target);
  };

  const proposeTutorSchedule = async (payload: ScheduleProposalPayload) => {
    if (!schedulingLesson) return;
    try {
      const updated = await edututorApi.proposeLesson(schedulingLesson.id, payload as unknown as Record<string, unknown>) as LessonRequest;
      setLessons((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSchedulingLesson(null);
      await refreshLessonData();
      toast.success("Đã gửi lịch học để học viên xác nhận.");
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const message = typeof detail === "string" && detail.trim() ? detail : "Không thể gửi lịch học. Hãy kiểm tra lại thông tin.";
      toast.error(message);
      throw new Error(message);
    }
  };

  const markAttendance = async (id: string, status: "completed" | "no_show") => {
    setSaving(true);
    try {
      const updated = await edututorApi.markLessonAttendance(id, status);
      setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(status === "completed" ? "Đã điểm danh học viên có mặt." : "Đã ghi nhận học viên vắng mặt.");
    } catch { toast.error("Không thể điểm danh buổi học này."); }
    finally { setSaving(false); }
  };

  const answerQuestion = async (question: TutorQuestion) => {
    const answer = (answerDrafts[question.id] ?? question.answer ?? "").trim();
    if (answer.length < 3) { toast.error("Câu trả lời cần ít nhất 3 ký tự."); return; }
    setSaving(true);
    try {
      const updated = await edututorApi.answerTutorQuestion(question.id, { answer });
      setQuestions((current) => current.map((item) => item.id === updated.id ? updated : item));
      setAnswerDrafts((current) => ({ ...current, [question.id]: "" }));
      toast.success("Đã trả lời bình luận. Nội dung đã hiển thị trên hồ sơ gia sư.");
    } catch {
      toast.error("Không thể gửi câu trả lời.");
    } finally { setSaving(false); }
  };

  const navigation: Array<{ key: PortalTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: "overview", label: "Tổng quan", icon: <ProfileOutlined /> },
    { key: "profile", label: "Cập nhật hồ sơ", icon: <ProfileOutlined /> },
    { key: "availability", label: "Lịch có thể dạy", icon: <CalendarOutlined /> },
    { key: "subjects", label: "Môn dạy", icon: <BookOutlined />, badge: pendingCount },
    { key: "lessons", label: "Chốt lịch & buổi học", icon: <ClockCircleOutlined /> },
    { key: "schedule", label: "Lịch học & điểm danh", icon: <CalendarOutlined /> },
    { key: "timetable", label: "Thời khóa biểu", icon: <TableOutlined /> },
    { key: "security", label: "Bảo mật", icon: <KeyOutlined /> },
  ];

  if (loading) return <main className="mx-auto min-h-[55vh] max-w-7xl px-4 py-12 text-center text-sm text-slate-500">Đang tải không gian làm việc của gia sư...</main>;
  if (!profile) return <main className="mx-auto min-h-[55vh] max-w-4xl px-4 py-12 text-center text-sm text-slate-600">Không tải được hồ sơ gia sư. Vui lòng đăng nhập lại.</main>;

  return <ProfileFormContext.Provider value={{ form, setField: (name, value) => setForm((current) => ({ ...current, [name]: value })) }}><main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-blue-600">Không gian gia sư</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Quản lý việc dạy</h1><p className="mt-1 text-sm text-slate-500">Hồ sơ, lịch rảnh và yêu cầu học đều đồng bộ với EduTutor.</p></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{profile.status === "active" ? "Tài khoản đang hoạt động" : profile.status}</span></div>
    <div className="grid gap-6 lg:grid-cols-[245px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:h-fit">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-blue-600 text-base font-black text-white">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 1)}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{profile.name}</p><p className="truncate text-xs text-slate-500">{profile.email}</p></div></div>
        <nav className="flex gap-1 overflow-x-auto lg:block" aria-label="Điều hướng hồ sơ gia sư">{navigation.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:mb-1 lg:w-full ${tab === item.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><span className="flex items-center gap-3">{item.icon}{item.label}</span>{item.badge ? <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${tab === item.key ? "bg-white/20" : "bg-amber-100 text-amber-800"}`}>{item.badge}</span> : null}</button>)}</nav>
        <button type="button" onClick={() => { clearAuthSession(); router.replace("/login"); }} className="mt-3 flex w-full items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3 text-sm font-semibold text-slate-500 hover:text-rose-600"><LogoutOutlined />Đăng xuất</button>
      </aside>
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {tab === "overview" && <div className="space-y-6"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start"><div><h2 className="text-xl font-bold">Xin chào, {profile.name}</h2><p className="mt-1 text-sm text-slate-500">Cập nhật thông tin để phụ huynh dễ tìm và Admin có đủ dữ liệu hỗ trợ bạn.</p></div><button type="button" onClick={() => setTab("profile")} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Cập nhật hồ sơ</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs text-slate-500">Môn đang dạy</p><p className="mt-1 text-2xl font-black">{profile.subjects.length}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs text-slate-500">Yêu cầu chờ xử lý</p><p className="mt-1 text-2xl font-black">{lessons.filter((item) => item.status === "pending").length}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs text-slate-500">Khung giờ có thể dạy</p><p className="mt-1 text-2xl font-black">{slots.length}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs text-slate-500">Đánh giá</p><p className="mt-1 text-2xl font-black">{profile.rating_avg.toFixed(1)} <span className="text-sm font-semibold text-slate-400">/ 5</span></p></div></div><div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><SafetyCertificateOutlined className="mr-2" />Môn dạy mới sẽ được gửi Admin duyệt trước khi hiển thị công khai.</div></div>}
        {tab === "profile" && <form onSubmit={saveProfile} className="space-y-6"><div className="border-b border-slate-100 pb-4"><h2 className="text-xl font-bold">Cập nhật hồ sơ</h2><p className="mt-1 text-sm text-slate-500">Nội dung giới thiệu và chuyên môn sẽ hiển thị trên trang gia sư sau khi lưu.</p></div><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-blue-600 text-xl font-black text-white">{profile.avatar ? <img src={profile.avatar} alt="Ảnh đại diện" className="h-full w-full object-cover" /> : profile.name.slice(0, 1)}</div><label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Đổi ảnh<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} /></label>{avatarFile && <span className="text-xs text-slate-500">{avatarFile.name}</span>}</div><div className="grid gap-4 sm:grid-cols-2"><Input label="Họ và tên" name="name" /><Input label="Số điện thoại" name="phone" type="tel" /><Input label="Năm sinh" name="birth_year" type="number" /><label className="block text-sm font-semibold text-slate-700">Giới tính<select value={form.gender ?? ""} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500"><option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label><Input label="Quê quán" name="hometown" /><Input label="Giọng nói" name="voice" placeholder="Ví dụ: Giọng Bắc chuẩn" /><Input label="Cấp bậc / học vấn" name="education_level" placeholder="Ví dụ: Cử nhân Sư phạm" /><Input label="Chuyên ngành" name="major" /><Input label="Trường / nơi làm việc" name="institution" /><Input label="Kinh nghiệm (năm)" name="experience_years" type="number" /><label className="block text-sm font-semibold text-slate-700">Hình thức dạy<select value={form.teaching_mode ?? "both"} onChange={(event) => setForm((current) => ({ ...current, teaching_mode: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500"><option value="both">Online và trực tiếp</option><option value="online">Online</option><option value="offline">Trực tiếp</option></select></label><Input label="Học phí từ (VNĐ/giờ)" name="hourly_rate_min" type="number" /><Input label="Học phí đến (VNĐ/giờ)" name="hourly_rate_max" type="number" /></div><label className="block text-sm font-semibold text-slate-700">Tiêu đề giới thiệu<Input label="" name="headline" placeholder="Ví dụ: Gia sư Toán THPT · 5 năm kinh nghiệm" /></label><label className="block text-sm font-semibold text-slate-700">Giới thiệu & kinh nghiệm<textarea value={form.bio ?? ""} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={6} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-blue-500" placeholder="Kinh nghiệm, thành tích và phương pháp giảng dạy..." /></label><div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button></div></form>}
        {tab === "availability" && <div className="space-y-5"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold">Lịch có thể dạy</h2><p className="mt-1 text-sm text-slate-500">Bật những buổi còn trống. Lịch này được hiển thị trong hồ sơ công khai.</p></div><button type="button" onClick={() => void saveAvailability()} disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu lịch"}</button></div><div className="overflow-x-auto"><table className="min-w-[690px] w-full border-collapse text-center text-sm"><thead><tr><th className="border border-slate-200 bg-slate-50 p-3 text-left">Buổi</th>{days.map((day) => <th key={day} className="border border-slate-200 bg-slate-50 p-3">{day}</th>)}</tr></thead><tbody>{periods.map((period) => <tr key={period.value}><th className="border border-slate-200 bg-slate-50 p-3 text-left">{period.label}</th>{days.map((_, weekday) => { const active = slots.some((slot) => slot.weekday === weekday && slot.period === period.value); return <td key={weekday} className="border border-slate-200 p-1.5"><button type="button" aria-pressed={active} onClick={() => toggleSlot(weekday, period.value)} className={`h-10 w-full rounded-lg text-xs font-bold ${active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 hover:bg-blue-50"}`}>{active ? "Có thể dạy" : "Bận"}</button></td>; })}</tr>)}</tbody></table></div></div>}
        {tab === "subjects" && <div className="space-y-6"><div className="border-b border-slate-100 pb-4"><h2 className="text-xl font-bold">Môn dạy</h2><p className="mt-1 text-sm text-slate-500">Mọi thay đổi môn dạy đều được gửi tới Admin để duyệt trước khi công khai.</p></div><div><h3 className="text-sm font-bold">Môn đang được duyệt</h3><div className="mt-3 space-y-2">{profile.subjects.length ? profile.subjects.map((subject) => <div key={subject.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="font-bold text-slate-900">{subject.name}</p><p className="mt-0.5 text-xs text-slate-500">{subject.level || "Chưa ghi cấp độ"}{subject.price_per_hour ? ` · ${new Intl.NumberFormat("vi-VN").format(subject.price_per_hour)} VNĐ/giờ` : ""}</p></div><button type="button" disabled={saving} onClick={() => void sendSubjectChange("remove", subject.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Yêu cầu gỡ</button></div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có môn nào được duyệt.</p>}</div></div><div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4"><h3 className="font-bold text-slate-900">Gửi yêu cầu thêm môn</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Môn học<select value={subjectRequest.subject_id} onChange={(event) => setSubjectRequest((current) => ({ ...current, subject_id: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"><option value="">Chọn môn học</option>{catalogue.filter((subject) => !profile.subjects.some((item) => item.id === subject.id)).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="text-sm font-semibold">Cấp độ / khối lớp<input value={subjectRequest.level} onChange={(event) => setSubjectRequest((current) => ({ ...current, level: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal" placeholder="Ví dụ: THCS, THPT" /></label><label className="text-sm font-semibold">Học phí dự kiến (VNĐ/giờ)<input type="number" min="0" value={subjectRequest.price_per_hour} onChange={(event) => setSubjectRequest((current) => ({ ...current, price_per_hour: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal" /></label><label className="text-sm font-semibold">Ghi chú<input value={subjectRequest.note} onChange={(event) => setSubjectRequest((current) => ({ ...current, note: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal" placeholder="Kinh nghiệm liên quan" /></label></div><button type="button" disabled={saving} onClick={() => void sendSubjectChange("add")} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">Gửi Admin duyệt</button></div><div><h3 className="text-sm font-bold">Lịch sử yêu cầu</h3><div className="mt-3 space-y-2">{changes.length ? changes.map((change) => <div key={change.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm"><div><p className="font-semibold">{change.action === "add" ? "Thêm" : "Gỡ"} môn {change.subject.name}</p><p className="mt-0.5 text-xs text-slate-500">{change.level || ""}{change.review_note ? ` · ${change.review_note}` : ""}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${change.status === "approved" ? "bg-emerald-50 text-emerald-700" : change.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{statusText[change.status]}</span></div>) : <p className="text-sm text-slate-500">Chưa có yêu cầu thay đổi môn.</p>}</div></div></div>}
        {tab === "lessons" && schedulingLesson && <ScheduleProposalForm lesson={schedulingLesson} counterpartName={schedulingLesson.studentName} proposalRole="tutor-counter" availability={slots} onCancel={() => setSchedulingLesson(null)} onSubmit={proposeTutorSchedule} />}
        {tab === "lessons" && <div className="space-y-7"><div className="border-b border-slate-100 pb-4"><h2 className="text-xl font-bold">Quản lý buổi học</h2><p className="mt-1 text-sm text-slate-500">Xem đầy đủ lịch học trước khi chấp nhận hoặc từ chối yêu cầu.</p></div><div className="space-y-3">{lessons.length ? lessons.map((lesson) => <article key={lesson.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{lesson.studentName} · {lesson.subject}</h3><p className="mt-1 text-xs text-slate-400">Liên hệ: {contactPhone(lesson) || "Chưa cập nhật số điện thoại"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${lesson.status === "accepted" ? "bg-emerald-50 text-emerald-700" : lesson.status === "declined" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{lessonStatusText[lesson.status] || lesson.status}</span></div><LessonScheduleDetails lesson={lesson} />{lesson.message && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{lesson.message}</p>}{lesson.status === "pending" && lesson.proposedBy === "tutor" ? <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">Bạn đã gửi lịch này. Đang chờ học viên xem và xác nhận.</p> : null}{lesson.status === "pending" && lesson.proposedBy !== "tutor" && <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={() => void updateLesson(lesson, "accepted")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">Chấp nhận yêu cầu</button><button type="button" disabled={saving} onClick={() => void updateLesson(lesson, "declined")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60">Từ chối yêu cầu</button></div>}</article>) : <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Chưa có yêu cầu học nào gửi đến tài khoản này.</p>}</div></div>}
        {tab === "schedule" && <TutorSessionList sessions={sessions} saving={saving} onAttendance={(id, status) => void markAttendance(id, status)} />}
        {tab === "timetable" && <div className="space-y-5"><div className="border-b border-slate-100 pb-4"><h2 className="text-xl font-bold">Thời khóa biểu dạy</h2><p className="mt-1 text-sm text-slate-500">Toàn bộ lịch dạy từ Thứ 2 đến Thứ 7, chia theo sáng, trưa, chiều và tối.</p></div><WeeklyTimetable sessions={sessions} role="tutor" /></div>}
        {tab === "security" && <form onSubmit={changePassword} className="max-w-xl space-y-5"><div className="border-b border-slate-100 pb-4"><h2 className="text-xl font-bold">Đổi mật khẩu</h2><p className="mt-1 text-sm text-slate-500">Sau khi đổi mật khẩu, phiên hiện tại sẽ kết thúc và bạn cần đăng nhập lại.</p></div>{([ ["current_password", "Mật khẩu hiện tại"], ["new_password", "Mật khẩu mới"], ["confirm_password", "Xác nhận mật khẩu mới"]] as const).map(([key, label]) => <label key={key} className="block text-sm font-semibold text-slate-700">{label}<input required type="password" minLength={key === "current_password" ? undefined : 8} value={password[key]} onChange={(event) => setPassword((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" /></label>)}<button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? "Đang cập nhật..." : "Đổi mật khẩu"}</button></form>}
      </section>
    </div>
  </main></ProfileFormContext.Provider>;
}
