"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClassListing } from "@/lib/presentation-models";
import { edututorApi } from "@/lib/edututor-api";
import { toClassPresentation } from "@/lib/class-presenter";
import { ClassDetailClient } from "./ClassDetailClient";
import { useLiveApiRevision } from "@/lib/use-live-api-revision";

export function ClassDetailPageClient({ slug }: { slug: string }) {
  const apiRevision = useLiveApiRevision();
  const router = useRouter();
  const [classItem, setClassItem] = useState<ClassListing | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    edututorApi.tutorJob(slug)
      .then((data) => {
        if (!isCurrent) return;
        // Admin announcements are recruitment notices, not parent/student
        // class requests. Keep the old URL backwards-compatible by moving
        // them to the dedicated recruitment detail page before rendering the
        // class review/comment UI.
        if (data.posted_by_type === "admin") {
          router.replace(`/recruitment/${encodeURIComponent(slug)}`);
          return;
        }
        setClassItem(toClassPresentation(data));
      })
      .catch(() => {
        if (isCurrent) setError(true);
      });
    return () => { isCurrent = false; };
  }, [apiRevision, router, slug]);

  if (error) {
    return <main className="mx-auto min-h-[50vh] max-w-4xl px-4 py-16 text-center text-sm text-slate-600">Không tìm thấy yêu cầu tìm gia sư hoặc dữ liệu hiện chưa sẵn sàng.</main>;
  }
  if (!classItem) {
    return <main className="mx-auto min-h-[50vh] max-w-4xl px-4 py-16 text-center text-sm text-slate-500">Đang tải thông tin lớp...</main>;
  }

  return <ClassDetailClient initialClass={classItem} />;
}
