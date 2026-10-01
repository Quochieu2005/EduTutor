"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEduClerk, useEduUser } from "@/lib/auth";
import { AUTH_SESSION_EVENT, getAuthSession, type ActorType } from "@/lib/auth-session";
import { saveAuthSession } from "@/lib/auth-session";
import { edututorApi } from "@/lib/edututor-api";
import { toast } from "@/lib/toast";
import { getLessons } from "@/lib/api";
import type { LessonRequest } from "@/lib/types";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  PORTAL_STORE_EVENT,
  buildDemoTeachingSchedule,
  getEnrollmentRequests,
  getEnrollmentRequestsForUser,
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
  const [enrollments, setEnrollments] = useState<EnrollmentRequest[]>([]);
  const [application, setApplication] = useState<TutorApplication | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<EnrollmentRequest[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actorType, setActorType] = useState<ActorType>("student");
  const [apiAccount, setApiAccount] = useState<Record<string, unknown>>({});
  const [profileForm, setProfileForm] = useState({ displayName: "", username: "", phone: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [tutorRequests, setTutorRequests] = useState<LessonRequest[]>([]);
  const [tutorRequestsLoading, setTutorRequestsLoading] = useState(false);

  useEffect(() => {
    const syncActor = () => {
      const session = getAuthSession();
      setActorType(session?.actorType ?? "student");
      setApiAccount(session?.account ?? {});
    };
    syncActor();
    window.addEventListener(AUTH_SESSION_EVENT, syncActor);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, syncActor);
  }, []);

  useEffect(() => {
    if (!isSignedIn || !["student", "parent"].includes(actorType)) return;
    let cancelled = false;
    edututorApi.accountProfile().then((profile) => {
      if (cancelled) return;
      const detail = profile.student ?? profile.parent ?? {};
      setProfileForm({
        displayName: String(profile.account?.display_name ?? detail.name ?? ""),
        username: String(profile.account?.username ?? ""),
        phone: String(detail.phone ?? ""),
      });
    }).catch(() => toast.error("Không tải được hồ sơ tài khoản."));
    return () => { cancelled = true; };
  }, [actorType, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || actorType !== "tutor") return;
    let cancelled = false;
    setTutorRequestsLoading(true);
    getLessons().then((records) => {
      if (!cancelled) setTutorRequests(records);
    }).catch(() => {
      if (!cancelled) setTutorRequests([]);
    }).finally(() => {
      if (!cancelled) setTutorRequestsLoading(false);
    });
    return () => { cancelled = true; };
  }, [actorType, isSignedIn]);

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const profile = await edututorApi.updateAccountProfile({ display_name: profileForm.displayName.trim(), username: profileForm.username.trim(), phone: profileForm.phone.trim() });
      const session = getAuthSession();
      const detail = profile.student ?? profile.parent ?? {};
      const nextAccount = { ...(session?.account ?? {}), ...(profile.account ?? {}), name: detail.name ?? profileForm.displayName, phone: detail.phone ?? profileForm.phone, avatar: detail.avatar ?? profile.account?.avatar };
      if (session) saveAuthSession({ ...session, account: nextAccount, source: "local" });
      setApiAccount(nextAccount);
      toast.success("Đã cập nhật hồ sơ.");
    } catch {
      toast.error("Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  const refresh = useCallback(() => {
    if (!user) return;
    const nextApplication = getTutorApplicationForUser(user.id) ?? null;
    setApplication(nextApplication);
    setEnrollments(getEnrollmentRequestsForUser(user.id));
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
  const roleLabel = actorType === "admin" ? "Quản trị viên" : actorType === "tutor" ? "Gia sư" : actorType === "parent" ? "Phụ huynh" : "Học viên";
  const profileTitle = actorType === "admin" ? "Hồ sơ quản trị viên" : actorType === "tutor" ? "Hồ sơ gia sư" : actorType === "parent" ? "Hồ sơ phụ huynh" : "Hồ sơ học viên";

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Tài khoản {roleLabel}</p>
          <h1 className="text-3xl font-bold mt-1">{profileTitle}</h1>
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {profileAvatar ? <Image src={profileAvatar} alt="Ảnh đại diện" width={64} height={64} className="w-full h-full object-cover" /> : (profileName[0] || "U")}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{profileName}</h2>
            <p className="text-sm text-gray-500 break-all">{profileEmail}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{roleLabel}</span>
              {actorType !== "tutor" && actorType !== "admin" && application && application.status !== "rejected" && (
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
        </section>

        {actorType !== "tutor" && actorType !== "admin" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold">Cập nhật hồ sơ</h2>
              <p className="mt-1 text-xs text-gray-500">Thông tin này sẽ được tự động điền khi bạn đăng ký lớp hoặc gửi yêu cầu mời gia sư.</p>
            </div>
            <form onSubmit={handleProfileSave} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        {actorType !== "tutor" && actorType !== "admin" && <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold">Lớp đã đăng ký</h2>
              <p className="text-xs text-gray-500 mt-1">Các yêu cầu tham gia lớp bạn đã gửi tới Admin.</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">{enrollments.length}</span>
          </div>
          {enrollments.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Bạn chưa đăng ký lớp nào. <Link href="/classes" className="text-blue-600 font-semibold hover:underline">Xem danh sách lớp học</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrollments.map((request) => (
                <article key={request.id} className="rounded-xl border border-gray-200 p-4 space-y-2 hover:border-blue-200 hover:shadow-xs transition-all bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/classes/${request.classId}`}
                      className="font-bold text-sm text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                    >
                      {request.classTitle}
                    </Link>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
                        request.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : request.status === "rejected"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {enrollmentStatusLabel[request.status] || request.status}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 font-semibold">{request.subject} • {request.grade}</p>
                  <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-gray-400">Giáo viên:</dt><dd className="font-semibold text-right text-gray-800">{request.tutorName}</dd>
                    <dt className="text-gray-400">Lịch học:</dt><dd className="font-semibold text-right text-gray-800">{request.schedule}</dd>
                    <dt className="text-gray-400">Hình thức:</dt><dd className="font-semibold text-right text-purple-700 font-medium">{request.teachingMode === "online" ? "Online" : request.teachingMode === "offline" ? "Trực tiếp" : "Online & Trực tiếp"}</dd>
                    <dt className="text-gray-400">Học viên:</dt><dd className="font-semibold text-right text-gray-700">{request.studentName} ({request.age} tuổi)</dd>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>}

        {actorType === "tutor" && (
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

        {actorType !== "tutor" && actorType !== "admin" && application?.status === "approved" && (
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

        <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold">Bảo mật & tài khoản</h2>
            <p className="text-xs text-gray-500 mt-1">Đăng nhập hiện tại được API EduTutor quản lý.</p>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <div><strong>Phương thức đăng nhập</strong><p className="text-xs text-gray-500 mt-1">Email và mật khẩu EduTutor.</p></div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">Đang hoạt động</span>
          </div>
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <div><strong className="text-sm">Xóa tài khoản</strong><p className="text-xs text-gray-500 mt-1">Hành động này là vĩnh viễn và không thể hoàn tác.</p></div>
            <button type="button" onClick={() => setDeleteDialogOpen(true)} className="text-sm font-semibold text-rose-600 hover:text-rose-700 cursor-pointer">Xóa tài khoản</button>
          </div>
        </section>
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
