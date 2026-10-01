"use client";

import { useEffect, useState } from "react";
import type { Tutor, TutorOpenClass } from "@/lib/home-mock-data";
import { edututorApi } from "@/lib/edututor-api";
import { toTutorPresentation } from "@/lib/tutor-presenter";
import { TutorDetailClient } from "./TutorDetailClient";

export function TutorDetailPageClient({ slug }: { slug: string }) {
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    edututorApi.tutor(slug)
      .then((data) => {
        if (isCurrent) setTutor(toTutorPresentation(data));
      })
      .catch(() => {
        if (isCurrent) setError(true);
      });
    return () => { isCurrent = false; };
  }, [slug]);

  if (error) {
    return <main className="mx-auto min-h-[50vh] max-w-4xl px-4 py-16 text-center text-sm text-slate-600">Không tìm thấy hồ sơ gia sư hoặc dữ liệu hiện chưa sẵn sàng.</main>;
  }
  if (!tutor) {
    return <main className="mx-auto min-h-[50vh] max-w-4xl px-4 py-16 text-center text-sm text-slate-500">Đang tải hồ sơ gia sư...</main>;
  }

  // Public tutor API does not expose a tutor-created class catalogue yet;
  // keep this empty rather than showing made-up classes from mock data.
  const openClasses: TutorOpenClass[] = [];
  return <TutorDetailClient tutor={tutor} initialOpenClasses={openClasses} />;
}
