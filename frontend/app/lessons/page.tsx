"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getLessons, proposeLessonSchedule, updateLessonStatus } from "@/lib/api";
import { useEduUser } from "@/lib/auth";
import type { LessonRequest, ScheduleProposalPayload, User } from "@/lib/types";
import { LessonCard, ScheduleCalendar } from "@/components/lessons/LessonCard";

type Tab = "all" | "schedule";

export default function LessonsPage() {
  const { isLoaded, isSignedIn, user } = useEduUser();
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  const currentUser: User | null = useMemo(
    () => {
      if (!user) return null;
      const metadataRole = user.publicMetadata?.role;
      const role = metadataRole === "tutor" ? "tutor" : "student";
      return {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            fullName: user.fullName || "Học viên",
            role,
          };
    },
    [user],
  );

  useEffect(() => {
    let ignore = false;
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }

    getLessons(currentUser)
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
  }, [isLoaded, isSignedIn, router, currentUser]);



  async function handleStatusChange(
    id: string,
    status: LessonRequest["status"],
  ) {
    if (status === "completed" && currentUser?.role !== "tutor") {
      return;
    }
    if (
      status === "completed" &&
      !window.confirm("Xác nhận bạn đã hoàn thành buổi dạy này?")
    ) {
      return;
    }
    try {
      await updateLessonStatus(id, status, currentUser);
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l)),
      );
    } catch {
      alert("Không thể cập nhật trạng thái.");
    }
  }

  async function handleCounterProposal(id: string, payload: ScheduleProposalPayload) {
    try {
      const updated = await proposeLessonSchedule(id, payload);
      setLessons((prev) => prev.map((lesson) => (lesson.id === id ? updated : lesson)));
    } catch {
      alert("Không thể gửi đề xuất lịch mới.");
    }
  }

  if (!isLoaded || loading) {
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
            {currentUser?.role === "tutor"
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
                userRole={currentUser?.role}
                onAccept={(id) => handleStatusChange(id, "accepted")}
                onReject={(id) => handleStatusChange(id, "declined")}
                onComplete={(id) => handleStatusChange(id, "completed")}
                onCancel={(id) => handleStatusChange(id, "cancelled")}
                onCounterProposal={handleCounterProposal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
