"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  getAdminChatMessages,
  getMyTutorProfile,
  getTutorIncomingRequests,
  getTutorSchedule,
  respondToIncomingRequest,
  sendAdminChatMessage,
  updateScheduleSessionStatus,
} from "@/lib/api";
import type {
  ChatMessage,
  RequestSenderType,
  ScheduleSession,
  TutorIncomingRequest,
  TutorProfile,
} from "@/lib/types";
import { Badge, formatCurrency } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type TutorTab = "schedule" | "sessions" | "requests" | "chat";

// Helper function to calculate exact date (dd/mm/yyyy) for all 7 days of the current week
function getWeekDates() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, ...
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);

  const baseDays = [
    { key: "Thứ 2", label: "Thứ 2" },
    { key: "Thứ 3", label: "Thứ 3" },
    { key: "Thứ 4", label: "Thứ 4" },
    { key: "Thứ 5", label: "Thứ 5" },
    { key: "Thứ 6", label: "Thứ 6" },
    { key: "Thứ 7", label: "Thứ 7" },
    { key: "Chủ Nhật", label: "Chủ Nhật" },
  ];

  return baseDays.map((d, index) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);
    const dayStr = String(dayDate.getDate()).padStart(2, "0");
    const monthStr = String(dayDate.getMonth() + 1).padStart(2, "0");
    const yearStr = dayDate.getFullYear();
    const dateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
    return {
      ...d,
      dateString: dateFormatted,
      fullTitle: `${d.label} (${dateFormatted})`,
    };
  });
}

function getSessionStartHour(time: string) {
  const match = time.match(/\d{1,2}/);
  return match ? Number(match[0]) : -1;
}

const scheduleTimeSlots = [8, 10, 12, 14, 16, 18, 20];

export default function TutorDashboardPage() {
  const [activeTab, setActiveTab] = useState<TutorTab>("schedule");
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSession[]>([]);
  const [requests, setRequests] = useState<TutorIncomingRequest[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [requestSenderFilter, setRequestSenderFilter] = useState<string>("all");

  // Chat state
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Status toggle
  const [isAcceptingStudents, setIsAcceptingStudents] = useState(true);

  // Modal for rescheduling
  const [reschedulingSession, setReschedulingSession] =
    useState<ScheduleSession | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState("");

  const weekDaysWithDates = useMemo(() => getWeekDates(), []);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getMyTutorProfile(),
      getTutorSchedule(),
      getTutorIncomingRequests(),
      getAdminChatMessages(),
    ])
      .then(([prof, sched, reqs, chatMsgs]) => {
        if (!ignore) {
          setProfile(prof);
          setSchedule(sched);
          setRequests(reqs);
          setChats(chatMsgs);
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
  }, []);

  // Schedule action handlers
  async function handleCompleteSession(sessionId: string) {
    try {
      const updated = await updateScheduleSessionStatus(sessionId, "completed");
      setSchedule((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s)),
      );
      alert("Đã đánh dấu hoàn thành buổi học! Hệ thống đã ghi nhận học phí.");
    } catch {
      alert("Không thể cập nhật buổi học.");
    }
  }

  async function handleCancelSession(sessionId: string) {
    if (!confirm("Bạn có chắc chắn muốn hủy ca học này?")) return;
    try {
      const updated = await updateScheduleSessionStatus(sessionId, "cancelled");
      setSchedule((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s)),
      );
      alert("Đã hủy ca học thành công.");
    } catch {
      alert("Không thể hủy ca học.");
    }
  }

  function handleSaveReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!reschedulingSession || !rescheduleTime) return;
    setSchedule((prev) =>
      prev.map((s) =>
        s.id === reschedulingSession.id ? { ...s, time: rescheduleTime } : s,
      ),
    );
    setReschedulingSession(null);
    setRescheduleTime("");
    alert("Đã cập nhật giờ học mới thành công!");
  }

  // Request action handlers
  async function handleRequestResponse(
    requestId: string,
    status: "accepted" | "declined",
  ) {
    try {
      const updated = await respondToIncomingRequest(requestId, status);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updated : r)),
      );
      if (status === "accepted") {
        const freshSchedule = await getTutorSchedule();
        setSchedule(freshSchedule);
        alert(
          "✅ Bạn đã tiếp nhận yêu cầu thành công! Ca dạy đã được thêm vào Thời khóa biểu.",
        );
      } else {
        alert("Đã từ chối yêu cầu.");
      }
    } catch {
      alert("Thao tác thất bại.");
    }
  }

  // Chat action handler
  async function handleSendMessage(textToSend?: string) {
    const content = (textToSend || newMessage).trim();
    if (!content) return;

    setSendingMessage(true);
    try {
      const sent = await sendAdminChatMessage(content);
      setChats((prev) => [...prev, sent]);
      setNewMessage("");

      // Simulated auto-reply from Admin Support after 1.2s
      setTimeout(() => {
        const adminReply: ChatMessage = {
          id: `msg-admin-${Date.now()}`,
          sender: "admin",
          senderName: "Hỗ Trợ Giáo Viên - EduTutor Admin",
          text: `Cảm ơn Thầy đã liên hệ: "${content.substring(0, 45)}...". Ban Quản Trị EduTutor đã nhận được thông tin và đang xử lý hỗ trợ Thầy ngay ạ!`,
          timestamp: new Date().toISOString(),
          isRead: true,
        };
        setChats((prev) => [...prev, adminReply]);
      }, 1200);
    } catch {
      alert("Không thể gửi tin nhắn.");
    } finally {
      setSendingMessage(false);
    }
  }

  // Computed counts
  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );
  const upcomingSessionsCount = useMemo(
    () => schedule.filter((s) => s.status === "upcoming").length,
    [schedule],
  );
  const totalEarnedThisMonth = useMemo(() => {
    return schedule.reduce((sum, s) => {
      if (s.status === "completed" || s.status === "upcoming") {
        return sum + (s.hourlyRate || 250000);
      }
      return sum;
    }, 0);
  }, [schedule]);

  // Filtered Schedule
  const filteredSchedule = useMemo(() => {
    return schedule.filter((s) => {
      if (scheduleFilter === "today") return s.dayOfWeek.includes("Hôm nay");
      if (scheduleFilter === "upcoming") return s.status === "upcoming";
      if (scheduleFilter === "completed") return s.status === "completed";
      return true;
    });
  }, [schedule, scheduleFilter]);

  // Grouped Schedule by Day for Weekly View
  const weeklyScheduleMap = useMemo(() => {
    const map: Record<string, ScheduleSession[]> = {
      "Thứ 2": [],
      "Thứ 3": [],
      "Thứ 4": [],
      "Thứ 5": [],
      "Thứ 6": [],
      "Thứ 7": [],
      "Chủ Nhật": [],
    };

    schedule.forEach((session) => {
      for (const day of weekDaysWithDates) {
        if (session.dayOfWeek.includes(day.key)) {
          map[day.key].push(session);
          return;
        }
      }
      map["Thứ 2"].push(session);
    });

    return map;
  }, [schedule, weekDaysWithDates]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestSenderFilter === "all") return true;
      return r.senderType === (requestSenderFilter as RequestSenderType);
    });
  }, [requests, requestSenderFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium text-sm">
            Đang tải không gian làm việc của Giáo Viên...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 pb-16">
      {/* Top Banner Profile Summary */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-400 p-1 shrink-0 shadow-lg">
              <div className="w-full h-full bg-indigo-950 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-black text-white">
                {profile?.fullName?.charAt(0) || "T"}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {profile?.fullName || "Thầy Nguyễn Văn An"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-2xs font-bold flex items-center gap-1">
                  ✓ Đã kiểm duyệt
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-2xs font-bold">
                  ⭐ {profile?.rating || 4.9} ({profile?.reviewCount || 128}{" "}
                  đánh giá)
                </span>
              </div>
              <p className="text-blue-200 text-xs sm:text-sm">
                Môn:{" "}
                <strong>
                  {profile?.subjects.join(", ") || "Toán, Vật lý"}
                </strong>{" "}
                · Khu vực: {profile?.location || "Hà Nội & Online"} ·{" "}
                {profile?.experience || 10} năm kinh nghiệm
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAcceptingStudents(!isAcceptingStudents)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                isAcceptingStudents
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                  : "bg-gray-700/40 border-gray-600 text-gray-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAcceptingStudents
                    ? "bg-emerald-400 animate-ping"
                    : "bg-gray-400"
                }`}
              />
              <span>
                {isAcceptingStudents
                  ? "Đang sẵn sàng nhận lớp mới"
                  : "Tạm dừng nhận lớp"}
              </span>
            </button>

            <Link href="/profile">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
              >
                ✏️ Chỉnh sửa hồ sơ
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-md flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-2xs sm:text-xs font-bold uppercase">
                Ca dạy sắp tới
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
                {upcomingSessionsCount} buổi
              </h2>
            </div>
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
              📅
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-md flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-2xs sm:text-xs font-bold uppercase">
                Yêu cầu mới chờ duyệt
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                {pendingRequestsCount} yêu cầu
              </h2>
            </div>
            <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
              📥
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-md flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-2xs sm:text-xs font-bold uppercase">
                Thu nhập ước tính
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                {formatCurrency(totalEarnedThisMonth)}
              </h2>
            </div>
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              💰
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-md flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-2xs sm:text-xs font-bold uppercase">
                Học sinh đang dạy
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">
                {profile?.activeStudents || 6} học sinh
              </h2>
            </div>
            <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
              👨‍🎓
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-2xl p-1.5 border border-gray-200 shadow-xs flex space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === "schedule"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span>📅 Thời khóa biểu</span>
            <span
              className={`px-2 py-0.2 rounded-full text-3xs font-black ${
                activeTab === "schedule"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {schedule.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === "sessions"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span>📚 Ca dạy</span>
            <span
              className={`px-2 py-0.2 rounded-full text-3xs font-black ${
                activeTab === "sessions"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {schedule.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === "requests"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span>📥 Yêu cầu từ người dùng</span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.2 rounded-full bg-amber-400 text-gray-900 text-3xs font-black animate-pulse">
                {pendingRequestsCount} mới
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === "chat"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span>💬 Chat với Quản Trị Viên (Admin)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ========================================================================= */}
        {/* TAB 1: THỜI KHÓA BIỂU THEO TUẦN */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* 1. Phần Thời Khóa Biểu Theo Tuần (Có Ngày Tháng Năm Từng Thứ) */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-gray-100 gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    <span>📅 Thời Khóa Biểu 7 Ngày Trong Tuần</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      {schedule.length} ca học
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Lịch dạy hiển thị chi tiết theo từng thứ kèm ngày tháng năm
                    cụ thể
                  </p>
                </div>
              </div>

              {/* Schedule grid: columns are days, rows run from morning to evening. */}
              <div className="overflow-x-auto">
                <div className="min-w-[980px] grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-r border-gray-200 p-3 text-3xs font-bold text-gray-500">
                    Giờ
                  </div>
                  {weekDaysWithDates.map((day) => (
                    <div
                      key={day.key}
                      className="bg-gray-50 border-b border-r last:border-r-0 border-gray-200 p-3 text-center"
                    >
                      <p className="text-xs font-extrabold text-gray-900">
                        {day.label}
                      </p>
                      <p className="text-3xs font-semibold text-blue-700 mt-0.5">
                        {day.dateString}
                      </p>
                    </div>
                  ))}

                  {scheduleTimeSlots.map((slot) => (
                    <Fragment key={`slot-${slot}`}>
                      <div
                        key={`time-${slot}`}
                        className="min-h-[88px] bg-gray-50 border-b border-r border-gray-200 p-2 text-3xs font-bold text-gray-500 text-center"
                      >
                        {String(slot).padStart(2, "0")}:00
                      </div>
                      {weekDaysWithDates.map((day) => {
                        const sessions = (
                          weeklyScheduleMap[day.key] || []
                        ).filter((session) => {
                          const startHour = getSessionStartHour(session.time);
                          return startHour >= slot && startHour < slot + 2;
                        });

                        return (
                          <div
                            key={`${day.key}-${slot}`}
                            className="min-h-[88px] border-b border-r last:border-r-0 border-gray-200 p-1.5 bg-white"
                          >
                            {sessions.map((session) => (
                              <div
                                key={session.id}
                                className={`rounded-lg border p-2 text-left shadow-2xs ${
                                  session.status === "completed"
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-blue-200 bg-blue-50"
                                }`}
                              >
                                <p className="text-3xs font-black text-blue-800 truncate">
                                  {session.subject}
                                </p>
                                <p className="text-3xs font-bold text-gray-900 truncate mt-0.5">
                                  {session.studentName}
                                </p>
                                <p className="text-4xs text-gray-600 mt-0.5">
                                  {session.time}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DANH SÁCH CA DẠY */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  {[
                    { id: "all", label: "Tất cả ca dạy" },
                    { id: "today", label: "🔥 Ca học hôm nay" },
                    { id: "upcoming", label: "Sắp tới" },
                    { id: "completed", label: "Đã hoàn thành" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setScheduleFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        scheduleFilter === tab.id
                          ? "bg-gray-900 text-white shadow-xs"
                          : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-gray-500">
                  Hiển thị <strong>{filteredSchedule.length}</strong> ca học
                </span>
              </div>

              {/* Grid 3 Columns */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchedule.map((session) => {
                  const isOnline = session.mode === "online";
                  const isCompleted = session.status === "completed";
                  const isCancelled = session.status === "cancelled";

                  return (
                    <div
                      key={session.id}
                      className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                        isCompleted
                          ? "border-emerald-200 bg-emerald-50/20"
                          : isCancelled
                            ? "border-gray-200 opacity-60"
                            : "border-gray-200 shadow-xs hover:border-blue-300 hover:shadow-md"
                      }`}
                    >
                      <div>
                        {/* Top bar */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-extrabold">
                            {session.subject}
                          </span>
                          <Badge
                            variant={
                              isCompleted
                                ? "success"
                                : isCancelled
                                  ? "danger"
                                  : "info"
                            }
                          >
                            {isCompleted
                              ? "✓ Đã hoàn thành"
                              : isCancelled
                                ? "Đã hủy"
                                : session.dayOfWeek}
                          </Badge>
                        </div>

                        {/* Student info */}
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-base shrink-0">
                            {session.studentAvatar || "👨‍🎓"}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-gray-900 text-sm">
                              {session.studentName}
                            </h3>
                            <p className="text-3xs text-gray-500">
                              📞 {session.studentPhone || "0912 345 678"} ·{" "}
                              {session.gradeLevel || "Học sinh"}
                            </p>
                          </div>
                        </div>

                        {/* Session specs */}
                        <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-purple-600 font-bold">
                              ⏰
                            </span>
                            <span>
                              <strong>{session.time}</strong> (
                              {session.duration})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-bold">
                              {isOnline ? "🌐" : "📍"}
                            </span>
                            <span className="truncate">
                              {session.location}{" "}
                              {session.address ? `(${session.address})` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">
                              💵
                            </span>
                            <span className="font-bold text-emerald-700">
                              {formatCurrency(session.hourlyRate)} / buổi
                            </span>
                          </div>
                          {session.notes && (
                            <p className="text-3xs text-gray-500 bg-gray-50 p-2 rounded-lg mt-2 leading-relaxed">
                              💡 <em>{session.notes}</em>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        {isOnline &&
                          session.meetingLink &&
                          !isCompleted &&
                          !isCancelled && (
                            <a
                              href={session.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                            >
                              <span>🚀</span>
                              <span>Vào phòng học Online (Meet)</span>
                            </a>
                          )}

                        {!isCompleted && !isCancelled && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCompleteSession(session.id)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition"
                            >
                              ✓ Hoàn thành ca
                            </button>
                            <button
                              onClick={() => {
                                setReschedulingSession(session);
                                setRescheduleTime(session.time);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition"
                            >
                              Dời giờ
                            </button>
                            <button
                              onClick={() => handleCancelSession(session.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition"
                              title="Hủy buổi dạy"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: YÊU CẦU TỪ NGƯỜI DÙNG (GIAO DIỆN ĐẦY ĐỦ NHƯ BAN ĐẦU) */}
        {/* ========================================================================= */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* Sender Type Filter */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "Tất cả yêu cầu" },
                  { id: "student", label: "👨‍🎓 Từ Học sinh & Phụ huynh" },
                  { id: "admin", label: "🛡️ Từ Ban Quản Trị EduTutor" },
                  { id: "tutor", label: "👩‍🏫 Từ Giáo viên đồng nghiệp" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setRequestSenderFilter(filter.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      requestSenderFilter === filter.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-gray-500">
                Có <strong>{pendingRequestsCount}</strong> yêu cầu chưa phản hồi
              </span>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const isPending = req.status === "pending";
                const isAccepted = req.status === "accepted";

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl p-5 border transition-all ${
                      req.urgent
                        ? "border-amber-300 shadow-md ring-2 ring-amber-400/20"
                        : "border-gray-200 shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Sender info & request content */}
                      <div className="flex gap-4 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 text-xl font-bold flex items-center justify-center shrink-0 shadow-xs">
                          {req.avatar || "📩"}
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-extrabold text-gray-900">
                              {req.title}
                            </h3>
                            {req.urgent && (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-3xs font-black uppercase tracking-wider">
                                🔥 Cần duyệt gấp
                              </span>
                            )}
                            <Badge
                              variant={
                                isPending
                                  ? "warning"
                                  : isAccepted
                                    ? "success"
                                    : "danger"
                              }
                            >
                              {isPending
                                ? "Chờ phản hồi"
                                : isAccepted
                                  ? "✓ Đã tiếp nhận"
                                  : "Đã từ chối"}
                            </Badge>
                          </div>

                          <p className="text-xs font-bold text-gray-700">
                            Người gửi:{" "}
                            <span className="text-blue-700">
                              {req.senderName}
                            </span>{" "}
                            ·{" "}
                            <span className="text-gray-500 font-normal">
                              {req.senderRoleTitle}
                            </span>
                            {req.senderContact && (
                              <span className="text-gray-400 font-normal">
                                {" "}
                                (Liên hệ: {req.senderContact})
                              </span>
                            )}
                          </p>

                          <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl leading-relaxed border border-gray-100">
                            {req.content}
                          </p>

                          {/* Request specifications pills */}
                          {(req.subject ||
                            req.preferredTime ||
                            req.offeredRate) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-2xs">
                              {req.subject && (
                                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold">
                                  Môn: {req.subject}{" "}
                                  {req.gradeLevel ? `(${req.gradeLevel})` : ""}
                                </span>
                              )}
                              {req.preferredTime && (
                                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold">
                                  ⏰ {req.preferredTime}
                                </span>
                              )}
                              {req.location && (
                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold">
                                  📍 {req.location}
                                </span>
                              )}
                              {req.offeredRate && (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold">
                                  💵 {formatCurrency(req.offeredRate)} / buổi
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {isPending ? (
                        <div className="flex sm:flex-col gap-2 shrink-0 justify-end">
                          <button
                            onClick={() =>
                              handleRequestResponse(req.id, "accepted")
                            }
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <span>✓</span>
                            <span>Đồng ý nhận lớp</span>
                          </button>
                          <button
                            onClick={() =>
                              handleRequestResponse(req.id, "declined")
                            }
                            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <div className="text-right shrink-0">
                          <span className="text-3xs text-gray-400 block">
                            Đã xử lý lúc
                          </span>
                          <span className="text-xs font-semibold text-gray-600">
                            {new Date(req.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CHAT VỚI QUẢN TRỊ VIÊN (GIAO DIỆN ĐẦY ĐỦ NHƯ BAN ĐẦU) */}
        {/* ========================================================================= */}
        {activeTab === "chat" && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden flex flex-col h-[650px]">
            {/* Chat Top Header */}
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold">
                  🛡️
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                    <span>Hỗ Trợ Giáo Viên - EduTutor Admin</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-3xs sm:text-2xs text-blue-200">
                    Phản hồi trực tiếp 24/7 · Giải quyết sự cố &amp; Hỗ trợ ghép
                    lớp
                  </p>
                </div>
              </div>

              <span className="text-3xs px-2.5 py-1 rounded-full bg-white/15 text-blue-100 font-semibold">
                Kênh liên lạc chính thức
              </span>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-2xs font-bold text-blue-900 uppercase">
                Gợi ý nhắn nhanh:
              </span>
              {[
                "Nhờ Admin kết nối nhóm Zalo với phụ huynh",
                "Học sinh xin nghỉ 1 buổi tuần này",
                "Yêu cầu đối soát học phí tháng này",
                "Đề xuất mở thêm lớp kèm Toán 12",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 text-3xs font-semibold hover:bg-blue-100 transition shadow-2xs"
                >
                  + {prompt}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50/50">
              {chats.map((msg) => {
                const isTutor = msg.sender === "tutor";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${
                      isTutor ? "ml-auto flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold shadow-2xs ${
                        isTutor
                          ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                          : "bg-indigo-900 text-white"
                      }`}
                    >
                      {isTutor ? "T" : "🛡️"}
                    </div>

                    <div className="space-y-1">
                      <p
                        className={`text-3xs font-bold text-gray-500 ${
                          isTutor ? "text-right" : ""
                        }`}
                      >
                        {msg.senderName}
                      </p>
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                          isTutor
                            ? "bg-blue-600 text-white rounded-tr-xs"
                            : "bg-white text-gray-800 border border-gray-200 rounded-tl-xs"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <p
                        className={`text-4xs text-gray-400 ${
                          isTutor ? "text-right" : ""
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 sm:p-4 bg-white border-t border-gray-200 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Nhập tin nhắn trao đổi với Ban Quản Trị EduTutor..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sendingMessage}
                className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="h-11 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-xs sm:text-sm shadow-md"
              >
                {sendingMessage ? "Đang gửi..." : "Gửi tin →"}
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Modal Reschedule Session */}
      {reschedulingSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h3 className="font-extrabold text-base text-gray-900 mb-2">
              Dời giờ ca học - {reschedulingSession.studentName}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Môn: {reschedulingSession.subject} ·{" "}
              {reschedulingSession.dayOfWeek}
            </p>

            <form onSubmit={handleSaveReschedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Khung giờ mới
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 19:30 - 21:30"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReschedulingSession(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                >
                  Hủy
                </button>
                <Button type="submit">Lưu giờ học mới</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
