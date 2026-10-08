"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { edututorApi, type BlogCategory, type BlogPost, type BlogPostDetail } from "@/lib/edututor-api";
import { useLiveApiRevision } from "@/lib/use-live-api-revision";

function formatDate(value: string | null) {
  if (!value) return "Mới cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(new Date(`${value}T00:00:00`));
}

function BlogContent() {
  const apiRevision = useLiveApiRevision();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramCategory = searchParams.get("category") || "";
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadedCategory, setLoadedCategory] = useState("");
  const [postsErrorCategory, setPostsErrorCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPostDetail | null>(null);

  useEffect(() => {
    let isCurrent = true;
    edututorApi.blogCategories()
      .then((items) => {
        if (isCurrent) setCategories(items);
      })
      .catch(() => {
        if (isCurrent) setCategoriesError(true);
      });
    return () => { isCurrent = false; };
  }, [apiRevision]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === paramCategory)?.slug || "",
    [categories, paramCategory],
  );

  useEffect(() => {
    if (!selectedCategory) return;
    let isCurrent = true;
    edututorApi.blogs({ page_size: 50, category: selectedCategory })
      .then((page) => {
        if (!isCurrent) return;
        setPosts(page.results);
        setLoadedCategory(selectedCategory);
        setPostsErrorCategory(null);
      })
      .catch(() => {
        if (isCurrent) {
          setPosts([]);
          setLoadedCategory(selectedCategory);
          setPostsErrorCategory(selectedCategory);
        }
      });
    return () => { isCurrent = false; };
  }, [apiRevision, selectedCategory]);

  const visiblePosts = loadedCategory === selectedCategory ? posts : [];
  const postsError = postsErrorCategory === selectedCategory;
  const isLoadingPosts = Boolean(selectedCategory) && loadedCategory !== selectedCategory && !postsError;

  const chooseCategory = (slug: string) => {
    router.push(`/blog?category=${encodeURIComponent(slug)}`);
  };

  const openPost = async (post: BlogPost) => {
    try {
      const detail = await edututorApi.blog(post.slug);
      setSelectedPost(detail);
    } catch {
      setSelectedPost({ ...post, content: post.excerpt || "Bài viết chưa có nội dung chi tiết." });
    }
  };

  return (
    <main className="flex-1 bg-slate-50">
      <section className="py-12 sm:py-16 border-b border-blue-50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Góc chia sẻ EduTutor</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Blog EduTutor</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">
            Chọn một danh mục để xem các bài viết được xuất bản từ Admin.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 mb-8" aria-label="Danh mục Blog">
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => chooseCategory(category.slug)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === category.slug
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {category.name}
              </button>
            ))}
            {categoriesError && <p className="text-xs text-rose-600">Không tải được danh mục Blog từ Admin.</p>}
          </div>

          {!selectedCategory ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-12 text-center text-sm text-slate-500">
              Chọn danh mục Blog để xem bài viết.
            </div>
          ) : isLoadingPosts ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-12 text-center text-sm text-slate-500">
              Đang tải bài viết...
            </div>
          ) : postsError ? (
            <div className="rounded-3xl border border-rose-100 bg-white p-12 text-center text-sm text-rose-600">
              Không tải được bài viết của danh mục này.
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-12 text-center text-sm text-slate-500">
              Danh mục này chưa có bài viết được xuất bản.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              {visiblePosts.map((post) => (
                <article key={post.slug} className="rounded-3xl border border-blue-100/80 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                      {post.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.thumbnail} alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-blue-500">
                          <BookOutlined className="text-3xl" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
                        <CalendarOutlined className="text-blue-500" />
                        <span>{formatDate(post.published_at)}</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-3">
                        {post.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
                        {post.excerpt || "Xem nội dung bài viết từ EduTutor."}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-2">
                    <button type="button" onClick={() => void openPost(post)} className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer group-hover:translate-x-1 duration-200">
                      <BookOutlined /> Xem bài viết <ArrowRightOutlined />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedPost && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <article className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{selectedPost.category?.name || "Blog EduTutor"}</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{selectedPost.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{formatDate(selectedPost.published_at)}</p>
              </div>
              <button type="button" onClick={() => setSelectedPost(null)} aria-label="Đóng" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
                <CloseOutlined />
              </button>
            </div>
            <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-100">
              {selectedPost.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedPost.thumbnail} alt={selectedPost.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-blue-500">
                  <BookOutlined className="text-4xl" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedPost.content}</div>
          </article>
        </div>
      )}
    </main>
  );
}

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <Suspense fallback={<main className="flex-1 bg-slate-50 p-16 text-center text-sm text-slate-500">Đang tải Blog...</main>}>
        <BlogContent />
      </Suspense>
      <Footer />
    </div>
  );
}
