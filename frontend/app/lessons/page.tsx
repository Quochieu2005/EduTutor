"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getLessons, updateLessonStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { LessonRequest } from "@/lib/types";
import { LessonCard, ScheduleCalendar } from "@/components/lessons/LessonCard";

type Tab = "all" | "schedule";

export default function LessonsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    let ignore = false;
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    getLessons()
      .then((data) => {
        if (!ignore) setLessons(data);
      })
      .catch(() => {
        if (!ignore) setLessons([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [user, authLoading, router]);

  async function handleStatusChange(
    id: string,
    status: LessonRequest["status"],
  ) {
    try {
      await updateLessonStatus(id, status);
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l)),
      );
    } catch {
      alert("Không thể cập nhật trạng thái.");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Đang tải lịch học...
      </div>
    );
  }

  const filtered =
    tab === "schedule"
      ? lessons.filter((l) => l.status === "accepted")
      : lessons;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý buổi học
          </h1>
          <p className="text-gray-600">
            {user?.role === "tutor"
              ? "Xem và quản lý các yêu cầu học từ học sinh"
              : "Theo dõi yêu cầu học và lịch học của bạn"}
          </p>
        </div>

        <div className="flex gap-2 border-b">
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Tất cả yêu cầu
          </button>
          <button
            onClick={() => setTab("schedule")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === "schedule"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Lịch học
          </button>
        </div>

        {tab === "schedule" ? (
          <ScheduleCalendar lessons={lessons} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Chưa có yêu cầu học nào.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                userRole={user?.role}
                onAccept={(id) => handleStatusChange(id, "accepted")}
                onReject={(id) => handleStatusChange(id, "rejected")}
                onComplete={(id) => handleStatusChange(id, "completed")}
                onCancel={(id) => handleStatusChange(id, "cancelled")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
