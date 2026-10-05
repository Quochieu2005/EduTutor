"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { edututorApi, type BlogPost } from "@/lib/edututor-api";

function formatDate(value: string | null) {
  if (!value) return "Mới cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Mới cập nhật"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function blogHref(post: BlogPost) {
  return post.category?.slug
    ? `/blog?category=${encodeURIComponent(post.category.slug)}`
    : "/blog";
}

/** Bài viết xuất bản từ API Blog; không dùng dữ liệu mẫu trên trang chủ. */
export function BlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    edututorApi.blogs({ page_size: 6 })
      .then((page) => {
        if (isCurrent) setPosts(page.results);
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
    <section id="blog" className="border-t border-blue-50 bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            Góc chia sẻ EduTutor
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Blog EduTutor
          </h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Kiến thức, kinh nghiệm học tập và những chia sẻ hữu ích từ EduTutor.
          </p>
        </div>

        {isLoading ? (
          <div aria-label="Đang tải bài viết" className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="h-44 animate-pulse bg-slate-200 motion-reduce:animate-none" />
                <div className="space-y-4 p-6">
                  <div className="h-5 w-28 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
                  <div className="h-6 w-4/5 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-12 text-center text-sm text-rose-600">
            Chưa tải được bài viết từ hệ thống.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-12 text-center text-sm text-slate-500">
            Hiện chưa có bài viết được xuất bản.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group min-w-0 flex flex-col justify-between overflow-hidden rounded-3xl border border-blue-100/80 bg-white shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl motion-reduce:transform-none"
              >
                <div>
                  {post.thumbnail ? (
                    <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center border-b border-blue-50 bg-gradient-to-br from-blue-50 to-slate-50 text-blue-500">
                      <BookOutlined className="text-3xl" aria-hidden="true" />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                        {post.category?.name || "Blog EduTutor"}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-slate-400">
                        <CalendarOutlined className="text-blue-500" />
                        {formatDate(post.published_at)}
                      </span>
                    </div>
                    <h3 className="mb-3 line-clamp-2 break-words [overflow-wrap:anywhere] text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 sm:text-lg">
                      {post.title}
                    </h3>
                    <p className="line-clamp-3 break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-slate-500 sm:text-sm">
                      {post.excerpt || "Xem bài viết được EduTutor xuất bản."}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <Link
                    href={blogHref(post)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
                  >
                    Xem bài viết <ArrowRightOutlined />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-blue-700 hover:shadow-lg"
          >
            Xem tất cả bài viết <ArrowRightOutlined />
          </Link>
        </div>
      </div>
    </section>
  );
}

// Giữ export cũ để những nơi chưa đổi import không bị vỡ.
export const RecruitmentSection = BlogSection;
