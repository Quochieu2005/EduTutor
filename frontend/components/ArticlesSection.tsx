"use client";

import { useEffect, useState } from "react";
import {
  CalendarOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { edututorApi } from "@/lib/edututor-api";

interface Article {
  id: string;
  title: string;
  date: string;
  imageSrc: string;
  excerpt: string;
  content: string;
}

const ARTICLES: Article[] = [
  {
    id: "art-1",
    title: "5 dấu hiệu con đang cần gia sư hỗ trợ sớm",
    date: "Thứ Ba, 01/10/2024",
    imageSrc: "/assets/article-1.jpg",
    excerpt:
      "Con vẫn đi học đều, vẫn làm bài đầy đủ nhưng kết quả ngày càng giảm. Đó có thể là lời 'cầu cứu' mà con chưa biết cách nói ra...",
    content: `Việc nhận biết sớm những khó khăn trong học tập của con giúp cha mẹ can thiệp kịp thời trước khi con bị mất gốc hoàn toàn:
1. Con mất nhiều thời gian bất thường cho bài tập về nhà mà vẫn không hoàn thành tốt.
2. Tâm lý lo lắng, ngại đến trường hoặc né tránh các câu hỏi về điểm số trên lớp.
3. Điểm số các bài kiểm tra định kỳ có xu hướng giảm sút dù con vẫn chăm chỉ.
4. Mất tự tin khi đứng trước các dạng bài tập mới hoặc các bài toán vận dụng.
5. Thiếu phương pháp tư duy và lộ trình học tập khoa học.

Giải pháp tốt nhất là tìm kiếm một người gia sư đồng hành có chuyên môn và sự kiên nhẫn để từng bước lấy lại nền tảng cho con.`,
  },
  {
    id: "art-2",
    title: "Khi nào phụ huynh nên tìm gia sư cho con?",
    date: "Thứ Bảy, 02/12/2024",
    imageSrc: "/assets/article-2.jpg",
    excerpt:
      "Không phải đến khi con học kém mới cần gia sư. Chọn đúng thời điểm sẽ giúp con học nhẹ nhàng và tiến bộ hơn...",
    content: `Nhiều phụ huynh chỉ tìm gia sư khi kết quả thi của con đã báo động. Tuy nhiên, thời điểm vàng để đồng hành cùng con là:
- Đầu cấp học mới (lớp 1, lớp 6, lớp 10) khi khối lượng kiến thức và môi trường thay đổi đột ngột.
- Trước các kỳ thi chuyển cấp hoặc thi chứng chỉ quốc tế từ 6-12 tháng.
- Khi con có nguyện vọng phát triển năng khiếu hoặc bồi dưỡng học sinh giỏi.
- Khi cha mẹ quá bận rộn với công việc và cần người hỗ trợ giám sát, hướng dẫn con làm bài tập mỗi tối.`,
  },
  {
    id: "art-3",
    title: "Gia sư sinh viên hay giáo viên: Nên chọn ai?",
    date: "Thứ Tư, 06/11/2024",
    imageSrc: "/assets/article-3.jpg",
    excerpt:
      "Mỗi lựa chọn đều có những ưu điểm riêng. Hiểu rõ nhu cầu học tập của con sẽ giúp phụ huynh đưa ra quyết định phù hợp hơn...",
    content: `Cả hai nhóm gia sư đều có thế mạnh riêng biệt:
- **Gia sư sinh viên giỏi**: Trẻ trung, nhiệt tình, dễ gần gũi và nắm bắt tâm lý lứa tuổi của học sinh. Học phí linh hoạt, phù hợp cho học sinh cần người kèm cặp hằng ngày, lấy lại kiến thức cơ bản.
- **Giáo viên / Giảng viên**: Dày dặn kinh nghiệm, nắm vững cấu trúc đề thi, phương pháp sư phạm bài bản. Phù hợp cho học sinh ôn thi chuyên, chuyển cấp hoặc luyện thi đại học điểm cao.

Tùy vào mục tiêu cụ thể và tính cách của con, trung tâm EduTutor sẽ tư vấn hồ sơ phù hợp nhất.`,
  },
];

export function ArticlesSection() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showAllArticles, setShowAllArticles] = useState(false);
  const [articles, setArticles] = useState<Article[]>(ARTICLES);

  useEffect(() => {
    edututorApi.blogs({ page_size: 24 }).then((page) => {
      if (!page.results.length) return;
      setArticles(page.results.map((post) => ({
        id: post.slug,
        title: post.title,
        date: post.published_at ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(new Date(`${post.published_at}T00:00:00`)) : "Mới cập nhật",
        imageSrc: post.thumbnail || "/assets/article-1.jpg",
        excerpt: post.excerpt || "Xem nội dung bài viết từ EduTutor.",
        content: "",
      })));
    }).catch(() => {
      // Keep local editorial content readable if the public API is temporarily unavailable.
    });
  }, []);

  const openArticle = async (article: Article) => {
    setSelectedArticle(article);
    try {
      const detail = await edututorApi.blog(article.id);
      setSelectedArticle((current) => current?.id === article.id ? { ...current, content: detail.content } : current);
    } catch {
      // The preview data remains available as a fallback.
    }
  };

  return (
    <section id="articles" className="py-16 sm:py-24 bg-slate-50 border-t border-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Góc Chia Sẻ & Kiến Thức
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Bài viết chia sẻ
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2">
            Kinh nghiệm học tập và đồng hành cùng con mỗi ngày
          </p>
        </div>

        {/* Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {articles.slice(0, 3).map((art) => (
            <article
              key={art.id}
              className="rounded-3xl border border-blue-100/80 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Article Image */}
                <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={art.imageSrc} alt={art.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>

                <div className="p-6">
                  {/* Date with Ant Design Icon */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
                    <CalendarOutlined className="text-blue-500" />
                    <span>{art.date}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-3">
                    {art.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>
              </div>

              {/* Read More Button */}
              <div className="px-6 pb-6 pt-2">
                <button
                  type="button"
                  onClick={() => openArticle(art)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer group-hover:translate-x-1 duration-200"
                >
                  <span>Xem chi tiết</span>
                  <ArrowRightOutlined className="text-xs" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* View All Articles Action */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setShowAllArticles(true)}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-slate-900/10 hover:shadow-lg transition-all cursor-pointer"
          >
            <span>Xem tất cả bài viết</span>
            <ArrowRightOutlined />
          </button>
        </div>
      </div>

      {/* Article Detail Modal (Ensures no broken '#' links) */}
      {selectedArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <BookOutlined /> Bài viết chuyên môn
                </span>
                <h3 id="article-modal-title" className="text-xl sm:text-2xl font-bold text-slate-900">
                  {selectedArticle.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <CalendarOutlined /> {selectedArticle.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                aria-label="Đóng"
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer text-base"
              >
                <CloseOutlined />
              </button>
            </div>

            <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedArticle.imageSrc} alt={selectedArticle.title} className="h-full w-full object-cover" />
            </div>

            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {selectedArticle.content}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Đóng bài viết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Articles Archive Modal */}
      {showAllArticles && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-articles-title"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="all-articles-title" className="text-2xl font-bold text-slate-900">
                  Tất cả bài viết chia sẻ
                </h3>
                <p className="text-xs text-slate-500 mt-1">Cập nhật kinh nghiệm học tập và phương pháp giảng dạy</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllArticles(false)}
                aria-label="Đóng"
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer text-base"
              >
                <CloseOutlined />
              </button>
            </div>

            <div className="space-y-4">
              {articles.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setShowAllArticles(false);
                    openArticle(item);
                  }}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex flex-col sm:flex-row gap-4 items-center cursor-pointer group"
                >
                  <div className="relative w-full sm:w-36 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageSrc} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-blue-600 font-semibold">{item.date}</span>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors mt-0.5 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllArticles(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
