"use client";

import { useMemo, useState } from "react";
import type { LessonRequest, ScheduleProposalPayload, UserRole } from "@/lib/types";
import type { LessonSession } from "@/lib/edututor-api";
import { Badge, Card, statusBadgeVariant, statusLabels } from "../ui/Card";
import { Button } from "../ui/Button";

interface LessonCardProps {
  lesson: LessonRequest;
  userRole?: UserRole;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onCounterProposal?: (id: string, payload: ScheduleProposalPayload) => void;
  onSchedule?: (lesson: LessonRequest) => void;
}

const weekdayText = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const periodText = { morning: "Sáng", afternoon: "Chiều", evening: "Tối" };

function ProposedScheduleDetails({ lesson }: { lesson: LessonRequest }) {
  if (!lesson.preferredDate) return null;
  const start = new Date(`${lesson.preferredDate}T12:00:00`);
  const end = lesson.recurrenceEndDate ? new Date(`${lesson.recurrenceEndDate}T12:00:00`) : null;
  const slots = lesson.weeklySlots ?? [];
  return <dl className="mt-3 grid gap-x-4 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-700 sm:grid-cols-2">
    <div><dt className="inline font-semibold text-slate-900">Ngày bắt đầu: </dt><dd className="inline">{start.toLocaleDateString("vi-VN")}</dd></div>
    <div><dt className="inline font-semibold text-slate-900">Áp dụng đến: </dt><dd className="inline">{end ? end.toLocaleDateString("vi-VN") : "Chưa xác định"}</dd></div>
    <div className="sm:col-span-2"><dt className="inline font-semibold text-slate-900">Lịch đăng ký: </dt><dd className="inline">{slots.length ? slots.map((slot) => `${weekdayText[slot.weekday]} · ${periodText[slot.period]} (${slot.startTime}–${slot.endTime})`).join("; ") : `${lesson.preferredTime}${lesson.endTime ? `–${lesson.endTime}` : ""}`}</dd></div>
    <div className="sm:col-span-2"><dt className="inline font-semibold text-slate-900">Hình thức: </dt><dd className="inline">{lesson.mode === "online" ? "Học online" : lesson.mode === "offline" ? "Học trực tiếp" : "Chưa chọn"}</dd></div>
    <div className="break-all sm:col-span-2"><dt className="inline font-semibold text-slate-900">{lesson.mode === "online" ? "Liên kết lớp: " : "Địa điểm: "}</dt><dd className="inline">{lesson.mode === "online" ? lesson.meetingUrl || "Chưa có liên kết" : lesson.location || "Chưa có địa điểm"}</dd></div>
    {lesson.proposalNote && <div className="sm:col-span-2"><dt className="inline font-semibold text-slate-900">{lesson.proposedBy === "tutor" ? "Lý do từ gia sư: " : "Lý do từ học viên: "}</dt><dd className="inline">{lesson.proposalNote}</dd></div>}
  </dl>;
}

export function LessonCard({
  lesson,
  userRole,
  onAccept,
  onReject,
  onComplete,
  onCancel,
  onCounterProposal,
  onSchedule,
}: LessonCardProps) {
  const isTutor = userRole === "tutor";
  const counterpart = isTutor ? lesson.studentName : lesson.tutorName;
  const mySide = isTutor ? "tutor" : "student";
  const proposedBy = lesson.proposedBy ?? "student";
  const canRespond = lesson.status === "pending" && proposedBy !== mySide;
  const needsFirstSchedule = lesson.status === "accepted" && !lesson.preferredDate;

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="info">{lesson.subject}</Badge>
            <Badge variant={statusBadgeVariant[lesson.status]}>
              {statusLabels[lesson.status]}
            </Badge>
          </div>
          <h3 className="font-bold text-gray-900 mb-1">
            {isTutor ? `Học sinh: ${counterpart}` : `Gia sư: ${counterpart}`}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            {lesson.preferredDate
              ? `${new Date(`${lesson.preferredDate}T00:00:00`).toLocaleDateString("vi-VN")} lúc ${lesson.preferredTime || "Chưa chốt giờ"}`
              : "Chưa chốt ngày và giờ học"}
          </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {canRespond && <><Button size="sm" onClick={() => onAccept?.(lesson.id)}>Đồng ý lịch</Button><Button size="sm" variant="danger" onClick={() => onReject?.(lesson.id)}>Từ chối đề xuất</Button></>}
            {!isTutor && lesson.status === "pending" && proposedBy === "student" && <Button size="sm" variant="outline" onClick={() => onCancel?.(lesson.id)}>Hủy đề xuất</Button>}
            {!isTutor && lesson.status === "declined" && <Button size="sm" variant="outline" onClick={() => onSchedule?.(lesson)}>Chọn lại lịch học</Button>}
            {needsFirstSchedule && <Button size="sm" variant="outline" onClick={() => onSchedule?.(lesson)}>Chọn lịch học</Button>}
            {isTutor && lesson.status === "accepted" && <Button size="sm" variant="secondary" onClick={() => onComplete?.(lesson.id)}>Xác nhận đã dạy</Button>}
          </div>
        </div>
        <ProposedScheduleDetails lesson={lesson} />
        {lesson.message && <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{lesson.message}</p>}
      </div>
    </Card>
  );
}

export function ScheduleCalendar({ lessons }: { lessons: LessonRequest[] }) {
  const accepted = lessons.filter((l) => l.status === "accepted");

  if (accepted.length === 0) {
    return (
      <Card>
        <p className="text-gray-500 text-center py-8">Chưa có buổi học nào được lên lịch.</p>
      </Card>
    );
  }

  const grouped = accepted.reduce<Record<string, LessonRequest[]>>((acc, l) => {
    (acc[l.preferredDate] ??= []).push(l);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => (
        <Card key={date}>
          <h3 className="font-bold text-gray-900 mb-3">
            {new Date(date).toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="space-y-2">
            {grouped[date].map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
              >
                <span className="font-mono text-sm font-semibold text-blue-700 w-14">
                  {l.preferredTime}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{l.subject}</p>
                  <p className="text-sm text-gray-500">{l.tutorName}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ActualScheduleCalendar({ sessions }: { sessions: LessonSession[] }) {
  const [selectedCourse, setSelectedCourse] = useState("");
  if (!sessions.length) return <Card><p className="py-8 text-center text-gray-500">Chưa có buổi học nào được xác nhận.</p></Card>;
  const courses = sessions.reduce<Record<string, LessonSession[]>>((result, session) => {
    const key = session.seriesId || session.requestId || `${session.subject}-${session.tutorName}`;
    (result[key] ??= []).push(session);
    return result;
  }, {});
  const courseEntries = Object.entries(courses);
  const activeKey = courses[selectedCourse] ? selectedCourse : courseEntries[0][0];
  const ordered = [...courses[activeKey]].sort((a, b) => `${a.sessionDate}${a.startTime}`.localeCompare(`${b.sessionDate}${b.startTime}`));
  const first = ordered[0];
  return <div className="space-y-4">
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2" role="tablist" aria-label="Chọn môn học">
      {courseEntries.map(([key, course]) => <button key={key} type="button" role="tab" aria-selected={key === activeKey} onClick={() => setSelectedCourse(key)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${key === activeKey ? "bg-blue-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{course[0].subject}<span className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] ${key === activeKey ? "bg-white/20" : "bg-white"}`}>{course.length}</span></button>)}
    </div>
    <Card><div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><h3 className="font-bold text-slate-950">Lịch học: {first.subject}</h3><p className="mt-1 text-sm text-slate-500">Gia sư: {first.tutorName} · {ordered.length} buổi trong tháng</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{first.mode === "online" ? "Học online" : "Học trực tiếp"}</span></div><div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">{ordered.map((session) => <div key={session.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-blue-50 p-3"><span className="w-28 font-mono text-sm font-semibold text-blue-700">{session.startTime}–{session.endTime}</span><div className="min-w-48 flex-1"><p className="font-semibold text-gray-900">{new Date(`${session.sessionDate}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}</p><p className="text-xs text-gray-500">{session.mode === "online" ? "Liên kết lớp online" : session.location || "Địa điểm sẽ được cập nhật"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${session.status === "completed" ? "bg-emerald-100 text-emerald-700" : session.status === "no_show" ? "bg-rose-100 text-rose-700" : "bg-white text-blue-700"}`}>{session.status === "completed" ? "Đã học" : session.status === "no_show" ? "Vắng" : "Sắp học"}</span></div>)}</div></Card>
  </div>;
}

const timetablePeriods = [
  { key: "morning", label: "Sáng", range: "05:00–11:29" },
  { key: "noon", label: "Trưa", range: "11:30–13:29" },
  { key: "afternoon", label: "Chiều", range: "13:30–17:59" },
  { key: "evening", label: "Tối", range: "18:00–23:00" },
] as const;

function timetablePeriod(time: string) {
  if (time < "11:30") return "morning";
  if (time < "13:30") return "noon";
  if (time < "18:00") return "afternoon";
  return "evening";
}

export function WeeklyTimetable({ sessions, role }: { sessions: LessonSession[]; role: "learner" | "tutor" }) {
  const cells = useMemo(() => {
    const result = new Map<string, Array<{ key: string; session: LessonSession; count: number }>>();
    const unique = new Map<string, { session: LessonSession; count: number }>();
    for (const session of sessions) {
      const date = new Date(`${session.sessionDate}T12:00:00`);
      const weekday = date.getDay() === 0 ? 6 : date.getDay() - 1;
      if (weekday > 5) continue;
      const key = `${weekday}-${timetablePeriod(session.startTime)}-${session.subject}-${session.startTime}-${session.endTime}-${role === "tutor" ? session.studentName : session.tutorName}`;
      const found = unique.get(key);
      if (found) found.count += 1;
      else unique.set(key, { session, count: 1 });
    }
    for (const [key, item] of unique) {
      const parts = key.split("-");
      const cellKey = `${parts[0]}-${parts[1]}`;
      result.set(cellKey, [...(result.get(cellKey) ?? []), { key, ...item }]);
    }
    return result;
  }, [role, sessions]);

  if (!sessions.length) return <Card><p className="py-10 text-center text-sm text-slate-500">Chưa có lịch học nào được hai bên xác nhận.</p></Card>;
  const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[980px] border-collapse text-left"><thead><tr><th className="w-28 border-b border-r border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">Buổi</th>{days.map((day) => <th key={day} className="border-b border-slate-200 bg-slate-50 p-3 text-center text-sm font-bold text-slate-800">{day}</th>)}</tr></thead><tbody>{timetablePeriods.map((period) => <tr key={period.key}><th className="border-r border-t border-slate-200 bg-slate-50 p-3 align-top"><span className="block text-sm font-bold text-slate-800">{period.label}</span><span className="mt-1 block text-[11px] font-normal text-slate-400">{period.range}</span></th>{days.map((_, weekday) => { const items = cells.get(`${weekday}-${period.key}`) ?? []; return <td key={weekday} className="min-h-28 border-t border-slate-200 p-2 align-top">{items.length ? <div className="space-y-2">{items.map(({ key, session, count }) => <article key={key} className="rounded-lg border border-blue-100 bg-blue-50 p-2.5"><p className="text-xs font-bold text-blue-800">{session.subject}</p><p className="mt-1 text-xs font-semibold text-slate-700">{session.startTime}–{session.endTime}</p><p className="mt-1 truncate text-[11px] text-slate-500">{role === "tutor" ? `Học viên: ${session.studentName}` : `Gia sư: ${session.tutorName}`}</p><p className="mt-1 text-[10px] text-slate-400">{count} buổi trong tháng · {session.mode === "online" ? "Online" : "Trực tiếp"}</p></article>)}</div> : <div className="h-20 rounded-lg border border-dashed border-slate-100 bg-slate-50/50" />}</td>; })}</tr>)}</tbody></table></div>;
}
