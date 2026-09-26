"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MOCK_FEATURED_TUTORS } from "@/lib/home-mock-data";
import {
  PORTAL_STORE_EVENT,
  getEnrollmentRequests,
  getTutorApplications,
  updateEnrollmentStatus,
  updateTutorApplicationStatus,
  type EnrollmentRequest,
  type RequestStatus,
  type TutorApplication,
} from "@/lib/portal-store";

const statusLabel: Record<RequestStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export default function AdminTestPage() {
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRequest[]>([]);

  const refresh = useCallback(() => {
    setApplications(getTutorApplications());
    setEnrollments(getEnrollmentRequests());
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(refresh, 0);
    window.addEventListener(PORTAL_STORE_EVENT, refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(PORTAL_STORE_EVENT, refresh);
    };
  }, [refresh]);

  const updateApplication = (id: string, status: RequestStatus) => {
    updateTutorApplicationStatus(id, status, status === "approved" ? "tut-1" : undefined);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">EduTutor Demo</p>
            <h1 className="text-3xl font-bold mt-1">Admin thử nghiệm</h1>
            <p className="text-sm text-slate-400 mt-1">Dữ liệu được lưu trong localStorage của trình duyệt để kiểm thử luồng giao diện.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/profile" className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-900">Profile</Link>
            <Link href="/Home" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400">Trang chủ</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs text-slate-400">Hồ sơ gia sư</p><strong className="text-3xl mt-2 block">{applications.length}</strong></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs text-slate-400">Yêu cầu tham gia lớp</p><strong className="text-3xl mt-2 block">{enrollments.length}</strong></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs text-slate-400">Đang chờ xử lý</p><strong className="text-3xl mt-2 block text-amber-400">{applications.filter((item) => item.status === "pending").length + enrollments.filter((item) => item.status === "pending").length}</strong></div>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-800"><h2 className="text-xl font-bold">Hồ sơ đăng ký làm gia sư</h2><p className="text-xs text-slate-400 mt-1">Duyệt hồ sơ để tài khoản có thể đăng ký nhận lớp.</p></div>
          {applications.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Chưa có hồ sơ.</p> : (
            <div className="divide-y divide-slate-800">
              {applications.map((application) => (
                <article key={application.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{application.fullName}</h3><span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800">{statusLabel[application.status]}</span></div>
                    <p className="text-xs text-cyan-400">{application.subject} • {application.grades} • {application.city}</p>
                    <p className="text-xs text-slate-400">{application.experience} năm kinh nghiệm • {application.desiredFee} • {application.teachingMode}</p>
                    <p className="text-xs text-slate-300">{application.bio}</p>
                    <p className="text-[11px] text-slate-500 break-all">{application.userEmail}</p>
                    {application.assignedTutorId && <p className="text-[11px] text-emerald-400">Hồ sơ demo được liên kết: {MOCK_FEATURED_TUTORS.find((t) => t.id === application.assignedTutorId)?.name || application.assignedTutorId}</p>}
                  </div>
                  <div className="flex lg:flex-col gap-2 self-start">
                    <button type="button" onClick={() => updateApplication(application.id, "approved")} className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer">Duyệt</button>
                    <button type="button" onClick={() => updateApplication(application.id, "rejected")} className="px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold cursor-pointer">Từ chối</button>
                    <button type="button" onClick={() => updateApplication(application.id, "pending")} className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-bold cursor-pointer">Chờ duyệt</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Yêu cầu tham gia lớp học</h2>
              <p className="text-xs text-slate-400 mt-1">Yêu cầu từ học viên/phụ huynh gửi từ trang chi tiết lớp học và gia sư.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              {enrollments.length} yêu cầu
            </span>
          </div>
          {enrollments.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Chưa có yêu cầu.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-xs">
                <thead className="bg-slate-950/60 text-slate-400">
                  <tr>
                    <th className="p-3 text-left">Học viên</th>
                    <th className="p-3 text-left">Số điện thoại liên hệ</th>
                    <th className="p-3 text-left">Lớp đăng ký</th>
                    <th className="p-3 text-left">Gia sư & Lịch học</th>
                    <th className="p-3 text-left">Trạng thái</th>
                    <th className="p-3 text-right">Xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {enrollments.map((request) => (
                    <tr key={request.id} className="align-top hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <strong className="text-slate-100">{request.studentName}</strong>
                        <p className="text-slate-400 mt-1">{request.age} tuổi • {request.gender === "male" ? "Nam" : request.gender === "female" ? "Nữ" : "Khác"}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5 truncate max-w-[180px]">{request.userEmail}</p>
                      </td>
                      <td className="p-3 space-y-1">
                        <p className="text-slate-300">SĐT PH: <span className="font-mono text-cyan-300 font-semibold">{request.parentPhone}</span></p>
                        <p className="text-slate-300">SĐT HV: <span className="font-mono text-cyan-300 font-semibold">{request.studentPhone}</span></p>
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-200">{request.classTitle}</strong>
                        <p className="text-cyan-400 mt-1 font-semibold">{request.subject} • {request.grade}</p>
                        <p className="text-slate-400 text-[11px]">Hình thức: {request.teachingMode === "online" ? "Online" : request.teachingMode === "offline" ? "Trực tiếp" : "Online & Trực tiếp"}</p>
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-200">{request.tutorName}</strong>
                        <p className="text-slate-400 mt-1">{request.schedule}</p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full font-semibold inline-block text-[11px] border ${
                          request.status === "approved"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : request.status === "rejected"
                            ? "bg-rose-950 text-rose-300 border-rose-800"
                            : "bg-amber-950 text-amber-300 border-amber-800"
                        }`}>
                          {request.status === "approved" ? "Đã duyệt" : request.status === "rejected" ? "Bị từ chối" : "Chờ duyệt"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => updateEnrollmentStatus(request.id, "approved")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer transition-colors"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => updateEnrollmentStatus(request.id, "rejected")}
                            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer transition-colors"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => updateEnrollmentStatus(request.id, "pending")}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold cursor-pointer transition-colors"
                            title="Đặt lại trạng thái Chờ duyệt để kiểm thử"
                          >
                            Chờ duyệt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
