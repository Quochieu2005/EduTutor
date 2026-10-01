"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { edututorApi, type TutorJob } from "@/lib/edututor-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function RecruitmentSection() {
  const [jobs, setJobs] = useState<TutorJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    edututorApi.tutorJobs({ page_size: 6, posted_by: "admin" })
      .then((page) => {
        if (isCurrent) setJobs(page.results);
      })
      .catch(() => {
        if (isCurrent) setHasError(true);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, []);

  return (
    <section id="recruitment" className="py-16 sm:py-24 bg-slate-50 border-t border-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Cơ hội giảng dạy
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tuyển dụng gia sư
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2">
            Các tin tuyển dụng do EduTutor quản lý và cập nhật trực tiếp từ Admin
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-12 text-center text-sm text-slate-500">
            Đang tải thông báo tuyển dụng...
          </div>
        ) : hasError ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-12 text-center text-sm text-rose-600">
            Chưa tải được thông báo tuyển dụng từ hệ thống.
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-12 text-center text-sm text-slate-500">
            Hiện chưa có thông báo tuyển dụng đang mở.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {jobs.slice(0, 3).map((job) => (
              <article
                key={job.slug}
                className="rounded-3xl border border-blue-100/80 bg-white p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-400 mb-4">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <CalendarOutlined className="text-blue-500" />
                      {formatDate(job.created_at)}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Đang tuyển
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2 leading-snug mb-4">
                    {job.title}
                  </h3>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <BookOutlined className="text-blue-500" />
                      <span>{job.subject.name}{job.grade ? ` · ${job.grade}` : ""}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <EnvironmentOutlined className="text-blue-500" />
                      <span>{job.ward?.name || job.province.name}</span>
                    </p>
                    {job.schedule_expect && (
                      <p className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-blue-500" />
                        <span className="line-clamp-1">{job.schedule_expect}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={`/recruitment/${job.slug}`}
                  className="inline-flex items-center gap-2 mt-6 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Xem thông báo tuyển dụng <ArrowRightOutlined />
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/recruitment"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-slate-900/10 hover:shadow-lg transition-all"
          >
            Xem tất cả tin tuyển dụng <ArrowRightOutlined />
          </Link>
        </div>
      </div>
    </section>
  );
}
