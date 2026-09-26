"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
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
  rejected: "Từ chối",
};

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<EnrollmentRequest[]>([]);
  const [application, setApplication] = useState<TutorApplication | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<EnrollmentRequest[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    const initialLoad = window.setTimeout(refresh, 0);
    window.addEventListener(PORTAL_STORE_EVENT, refresh);
    return () => {
      window.clearTimeout(initialLoad);
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
      router.replace("/Home");
    } catch {
      setDeleteError("Không thể xóa tài khoản lúc này. Vui lòng thử lại hoặc kiểm tra cấu hình Clerk.");
    }
  };

  const usesGoogle = (user?.externalAccounts.length ?? 0) > 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Tài khoản EduTutor</p>
            <h1 className="text-3xl font-bold mt-1">Profile của bạn</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý lớp học, lịch dạy và trạng thái yêu cầu.</p>
          </div>
          <Link href="/admin-test" className="self-start px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800">
            Mở Admin thử nghiệm
          </Link>
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {user?.imageUrl ? <Image src={user.imageUrl} alt="Ảnh đại diện" width={64} height={64} className="w-full h-full object-cover" /> : (user?.firstName?.[0] || "U")}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{user?.fullName || "Thành viên EduTutor"}</h2>
            <p className="text-sm text-gray-500 break-all">{user?.primaryEmailAddress?.emailAddress}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Học viên</span>
              {application && (
                <span className={`px-2.5 py-1 rounded-full border ${application.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  Hồ sơ gia sư: {tutorStatusLabel[application.status]}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
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
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold">Hồ sơ và lịch dạy gia sư</h2>
              <p className="text-xs text-gray-500 mt-1">Lịch sáng–chiều từ Thứ 2 đến Chủ nhật.</p>
            </div>
            {!application && <Link href="/tutors/register" className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold">Đăng ký làm gia sư</Link>}
          </div>

          {!application ? (
            <p className="py-6 text-sm text-gray-500 text-center">Bạn chưa nộp hồ sơ gia sư.</p>
          ) : application.status !== "approved" ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Hồ sơ gia sư đang ở trạng thái <strong>{tutorStatusLabel[application.status]}</strong>. Admin cần duyệt trước khi lịch dạy được mở.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-separate border-spacing-1 text-xs">
                <thead>
                  <tr><th className="p-2 text-left text-gray-500">Buổi</th>{[2,3,4,5,6,7,8].map((day) => <th key={day} className="p-2 bg-gray-50 rounded-lg">{dayLabels[day]}</th>)}</tr>
                </thead>
                <tbody>
                  {(["morning", "afternoon"] as const).map((period) => (
                    <tr key={period}>
                      <th className="p-2 text-left text-gray-600">{period === "morning" ? "Sáng" : "Chiều"}</th>
                      {[2,3,4,5,6,7,8].map((day) => {
                        const item = schedule.find((entry) => entry.day === day && entry.period === period);
                        return <td key={day} className="align-top p-1 h-28">{item ? (
                          <div className="h-full rounded-lg bg-blue-50 border border-blue-100 p-2 space-y-1">
                            <strong className="block text-blue-800">{item.subject}</strong>
                            <span className="block text-gray-700">{item.grade}</span>
                            <span className="block text-gray-500">{item.time}</span>
                            <span className="block text-purple-700">{item.teachingMode === "online" ? "Online" : item.teachingMode === "offline" ? "Trực tiếp" : "Online & Trực tiếp"}</span>
                            {item.address && <span className="block text-gray-500">{item.address}</span>}
                          </div>
                        ) : <div className="h-full rounded-lg bg-gray-50 border border-dashed border-gray-200" />}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {application?.status === "approved" && (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h3 className="font-bold">Yêu cầu từ người dùng</h3>
              {incomingRequests.length === 0 ? <p className="text-xs text-gray-500">Chưa có yêu cầu mới.</p> : incomingRequests.map((request) => (
                <div key={request.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div><strong>{request.studentName}</strong><p className="text-gray-500 mt-0.5">{request.classTitle} • PH: {request.parentPhone} • HV: {request.studentPhone}</p></div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    request.status === "approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : request.status === "rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>{enrollmentStatusLabel[request.status]}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold">Bảo mật & tài khoản</h2>
            <p className="text-xs text-gray-500 mt-1">Đăng nhập hiện tại được Clerk quản lý.</p>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <div><strong>Phương thức đăng nhập</strong><p className="text-xs text-gray-500 mt-1">{usesGoogle ? "Google — không yêu cầu thiết lập mật khẩu riêng." : "Email và mật khẩu Clerk."}</p></div>
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
