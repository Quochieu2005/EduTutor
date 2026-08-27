"use client";

import type { LessonRequest, UserRole } from "@/lib/types";
import { Badge, Card, statusBadgeVariant, statusLabels } from "../ui/Card";
import { Button } from "../ui/Button";

interface LessonCardProps {
  lesson: LessonRequest;
  userRole?: UserRole;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function LessonCard({
  lesson,
  userRole,
  onAccept,
  onReject,
  onComplete,
  onCancel,
}: LessonCardProps) {
  const isTutor = userRole === "tutor";
  const counterpart = isTutor ? lesson.studentName : lesson.tutorName;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
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
            {new Date(lesson.preferredDate).toLocaleDateString("vi-VN")} lúc {lesson.preferredTime}
          </p>
          {lesson.message && (
            <p className="text-gray-600 text-sm">{lesson.message}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {isTutor && lesson.status === "pending" && (
            <>
              <Button size="sm" onClick={() => onAccept?.(lesson.id)}>Chấp nhận</Button>
              <Button size="sm" variant="danger" onClick={() => onReject?.(lesson.id)}>Từ chối</Button>
            </>
          )}
          {lesson.status === "accepted" && (
            <Button size="sm" variant="secondary" onClick={() => onComplete?.(lesson.id)}>
              Hoàn thành
            </Button>
          )}
          {(lesson.status === "pending" || lesson.status === "accepted") && (
            <Button size="sm" variant="outline" onClick={() => onCancel?.(lesson.id)}>
              Hủy
            </Button>
          )}
        </div>
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
