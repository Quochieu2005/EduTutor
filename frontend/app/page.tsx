"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SUBJECTS, LOCATIONS } from "@/lib/mock-data";

export default function HomePage() {
  const router = useRouter();

  // Quick search state in Hero
  const [quickSubject, setQuickSubject] = useState("");
  const [quickLocation, setQuickLocation] = useState("");

  // Consultation / Free Trial Form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    subject: "Toán",
    grade: "Lớp 9 (Luyện thi vào 10)",
    mode: "Tại nhà & Online",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleQuickSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (quickSubject) params.set("subject", quickSubject);
    if (quickLocation) params.set("location", quickLocation);
    router.push(`/tutors?${params.toString()}`);
  }

  function handleConsultationSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({
        fullName: "",
        phone: "",
        subject: "Toán",
        grade: "Lớp 9 (Luyện thi vào 10)",
        mode: "Tại nhà & Online",
        note: "",
      });
    }, 600);
  }

  const subjectCategories = [
    {
      id: "tieuhoc",
      title: "Gia sư Tiểu học",
      icon: "🎒",
      subject: "Toán",
      desc: "Rèn chữ đẹp, củng cố Toán & Tiếng Việt, tiếng Anh mầm non/tiểu học.",
      highlights: [
        "Luyện đọc & viết chữ đẹp",
        "Toán & Tiếng Việt lớp 1-5",
        "Xây dựng nền tảng vững",
      ],
    },
    {
      id: "toan",
      title: "Gia sư Môn Toán",
      icon: "📐",
      subject: "Toán",
      desc: "Củng cố kiến thức nền, phương pháp giải nhanh, luyện thi vào 10 và THPT QG.",
      highlights: [
        "Toán cấp 2 & cấp 3",
        "Luyện đề thi tuyển sinh",
        "Phát triển tư duy logic",
      ],
    },
    {
      id: "tienganh",
      title: "Gia sư Tiếng Anh",
      icon: "🇬🇧",
      subject: "Tiếng Anh",
      desc: "Giúp học sinh lấy lại gốc, mở rộng vốn từ vựng, ngữ pháp và phát âm chuẩn.",
      highlights: [
        "Lấy lại gốc nhanh chóng",
        "Luyện thi chứng chỉ KET/PET",
        "Giao tiếp phản xạ tự nhiên",
      ],
    },
    {
      id: "ielts",
      title: "Gia sư IELTS / TOEIC",
      icon: "🎯",
      subject: "Tiếng Anh",
      desc: "Luyện thi theo mục tiêu band điểm 6.5+ đến 8.0+, phát triển toàn diện 4 kỹ năng.",
      highlights: [
        "Chiến thuật Speaking & Writing",
        "Lộ trình cá nhân hóa",
        "Cam kết đầu ra mục tiêu",
      ],
    },
    {
      id: "van",
      title: "Gia sư Ngữ Văn",
      icon: "📚",
      subject: "Văn học",
      desc: "Rèn kỹ năng đọc hiểu văn bản, nâng cao khả năng viết văn nghị luận và cảm thụ.",
      highlights: [
        "Kỹ năng phân tích tác phẩm",
        "Nghị luận xã hội sâu sắc",
        "Bí quyết đạt điểm 8+ Văn",
      ],
    },
    {
      id: "lyhoa",
      title: "Gia sư Vật Lý - Hóa Học",
      icon: "⚡",
      subject: "Vật lý",
      desc: "Hiểu sâu bản chất hiện tượng, nắm chắc công thức trọng tâm và kỹ thuật giải đề.",
      highlights: [
        "Hệ thống hóa kiến thức",
        "Giải bài tập trắc nghiệm nhanh",
        "Bám sát cấu trúc đề thi",
      ],
    },
    {
      id: "laptrinh",
      title: "Gia sư Lập trình & Tin học",
      icon: "💻",
      subject: "Lập trình",
      desc: "Học lập trình Python, C++, Web, Scratch dành cho học sinh từ cơ bản đến nâng cao.",
      highlights: [
        "Tư duy thuật toán sáng tạo",
        "Luyện thi Tin học trẻ",
        "Xây dựng sản phẩm thực tế",
      ],
    },
    {
      id: "nangkhieu",
      title: "Toán Tư Duy & Năng Khiếu",
      icon: "🧠",
      subject: "Toán",
      desc: "Luyện thi Toán quốc tế TIMO, SASMO, AMC; Âm nhạc Piano, Guitar và Vẽ sáng tạo.",
      highlights: [
        "Toán quốc tế TIMO, AMC",
        "Piano, Guitar cơ bản - nâng cao",
        "Phát triển tư duy toàn diện",
      ],
    },
  ];

  const testimonials = [
    {
      name: "Chị Phương Linh",
      role: "Phụ huynh em Gia Huy (Lớp 7 - Cầu Giấy, HN)",
      avatarColor: "from-blue-500 to-indigo-600",
      content:
        "Gia sư rất tận tâm và kiên nhẫn với con. Sau 2 tháng học cùng thầy, bé tự tin và chủ động học bài hơn rất nhiều. Điểm thi giữa kỳ môn Toán của con tăng từ 6.0 lên 8.5.",
      rating: 5,
    },
    {
      name: "Anh Tuấn",
      role: "Phụ huynh em Minh Thư (Lớp 12 - Q.3, TP.HCM)",
      avatarColor: "from-purple-500 to-pink-500",
      content:
        "Điều mình đánh giá cao là EduTutor hỗ trợ kết nối rất nhanh. Gia sư IELTS xây dựng lộ trình rõ ràng, theo sát từng kỹ năng Speaking và Writing. Con vừa thi đạt 7.5 IELTS.",
      rating: 5,
    },
    {
      name: "Chị Lan",
      role: "Phụ huynh bé Bảo Nam (Lớp 4 - Hải Châu, Đà Nẵng)",
      avatarColor: "from-emerald-500 to-teal-600",
      content:
        "Gia sư rất trách nhiệm, luôn chuẩn bị giáo án kỹ trước mỗi buổi học và trao đổi thường xuyên với phụ huynh sau mỗi buổi dạy. Con rất thích cách dạy trực quan, sinh động.",
      rating: 5,
    },
    {
      name: "Chị Minh Yến",
      role: "Phụ huynh em Hoàng Long (Lớp 11 - Đống Đa, HN)",
      avatarColor: "from-amber-500 to-orange-500",
      content:
        "Con học chăm nhưng trước đây chưa có phương pháp ôn tập khoa học. Gia sư đã giúp con hệ thống lại kiến thức môn Hóa và Lý, kết quả kiểm tra gần đây cải thiện rõ rệt.",
      rating: 5,
    },
  ];

  const blogPosts = [
    {
      id: 1,
      title: "5 dấu hiệu cho thấy con đang cần gia sư đồng hành sớm",
      excerpt:
        "Nhận biết sớm các lỗ hổng kiến thức và tâm lý ngại hỏi bài của con để kịp thời hỗ trợ trước kỳ thi quan trọng.",
      tag: "Kinh nghiệm cho phụ huynh",
      readTime: "4 phút đọc",
    },
    {
      id: 2,
      title: "Nên chọn gia sư sinh viên hay giáo viên: Đâu là lựa chọn tối ưu?",
      excerpt:
        "Phân tích chi tiết ưu điểm, phương pháp giảng dạy và mức học phí để giúp ba mẹ chọn đúng người thầy cho con.",
      tag: "Tư vấn chọn gia sư",
      readTime: "5 phút đọc",
    },
    {
      id: 3,
      title:
        "Bí quyết giúp học sinh tự giác học bài mà không cần ba mẹ nhắc nhở",
      excerpt:
        "Cách thiết lập thời gian biểu khoa học, tạo động lực nội tại và nuôi dưỡng thói quen tự học bền vững.",
      tag: "Phương pháp học tập",
      readTime: "6 phút đọc",
    },
    {
      id: 4,
      title: "Học gia sư Online 1 kèm 1 hay học tại nhà hiệu quả hơn?",
      excerpt:
        "So sánh toàn diện tính linh hoạt, chi phí và hiệu quả tương tác của 2 hình thức học phổ biến hiện nay.",
      tag: "Xu hướng giáo dục",
      readTime: "4 phút đọc",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      {/* 1. HERO SECTION & QUICK TUTOR SEARCH */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50/60 to-pink-50/30 pt-12 pb-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 text-xs sm:text-sm font-semibold shadow-xs">
                <span>✨</span>
                <span>Nền tảng kết nối Gia Sư 1 kèm 1 chất lượng cao</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Tìm gia sư giỏi, tận tâm{" "}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Đồng hành cùng con
                </span>{" "}
                tiến bộ mỗi ngày
              </h1>

              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Kết nối nhanh chóng với mạng lưới{" "}
                <strong>500+ gia sư & giáo viên giỏi</strong> được tuyển chọn kỹ
                lưỡng. Học thử 01 buổi miễn phí, cam kết đổi gia sư 0đ nếu chưa
                phù hợp.
              </p>

              {/* Quick Search Widget - Khung nhỏ gọn, bo góc mềm mại, nền gradient xanh tím */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-600/20 border border-white/20 text-white transition-all">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/15">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                      Tìm gia sư nhanh
                    </h3>
                  </div>
                  <span className="text-3xs sm:text-2xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-blue-100">
                    500+ Gia sư sẵn sàng
                  </span>
                </div>

                <form
                  onSubmit={handleQuickSearch}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3"
                >
                  <div>
                    <label className="block text-2xs font-bold text-blue-100 mb-1 text-left uppercase tracking-wider">
                      Môn học
                    </label>
                    <select
                      value={quickSubject}
                      onChange={(e) => setQuickSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white text-gray-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm transition"
                    >
                      <option value="">Tất cả môn học</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-blue-100 mb-1 text-left uppercase tracking-wider">
                      Khu vực / Hình thức
                    </label>
                    <select
                      value={quickLocation}
                      onChange={(e) => setQuickLocation(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white text-gray-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm transition"
                    >
                      <option value="">Tất cả khu vực</option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full h-10 px-4 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🔍</span>
                      <span>Tìm gia sư ngay</span>
                    </button>
                  </div>
                </form>

                {/* Popular Search tags */}
                <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap items-center gap-1.5 text-xs text-blue-100">
                  <span className="font-semibold text-2xs text-blue-200 uppercase tracking-wider">
                    Gợi ý:
                  </span>
                  {[
                    "Toán",
                    "Tiếng Anh",
                    "Luyện thi vào 10",
                    "IELTS 6.5+",
                    "Lập trình",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const subj = tag.includes("Toán")
                          ? "Toán"
                          : tag.includes("Anh") || tag.includes("IELTS")
                            ? "Tiếng Anh"
                            : tag.includes("Lập trình")
                              ? "Lập trình"
                              : "";
                        if (subj) setQuickSubject(subj);
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-2xs font-medium border border-white/20 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Trust points - Đóng khung viền gọn gàng */}
              <div className="bg-white/90 backdrop-blur-xs border border-blue-100/90 rounded-2xl p-2.5 sm:p-3 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                  <div className="flex items-center gap-2 text-2xs sm:text-xs font-bold text-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs shrink-0">
                      🛡️
                    </span>
                    <span>Kiểm duyệt kỹ</span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs sm:text-xs font-bold text-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-xs shrink-0">
                      🎁
                    </span>
                    <span>Học thử 0đ</span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs sm:text-xs font-bold text-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-xs shrink-0">
                      🔄
                    </span>
                    <span>Đổi gia sư 0đ</span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs sm:text-xs font-bold text-gray-800">
                    <span className="w-6 h-6 rounded-lg bg-pink-100 flex items-center justify-center text-xs shrink-0">
                      ⚡
                    </span>
                    <span>Kết nối 0-3 ngày</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Showcase Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl shadow-purple-500/10 border border-purple-100/60">
                {/* Floating Top Badge */}
                <div className="absolute -top-4 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-md">
                  ★ 4.9/5 Đánh Giá Cao
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-blue-500/30">
                    🎓
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      Hồ Sơ Gia Sư Tiêu Biểu
                    </h3>
                    <p className="text-xs text-gray-500">
                      Đại học Sư Phạm & Ngoại Thương
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 mb-6 text-sm text-gray-600">
                  <div className="p-3 bg-blue-50/60 rounded-xl flex items-center justify-between border border-blue-100/50">
                    <span className="font-medium text-gray-800">
                      Tỷ lệ tiến bộ sau 4 tuần
                    </span>
                    <span className="font-bold text-blue-600">96.8%</span>
                  </div>
                  <div className="p-3 bg-purple-50/60 rounded-xl flex items-center justify-between border border-purple-100/50">
                    <span className="font-medium text-gray-800">
                      Học sinh đạt điểm 8.5+
                    </span>
                    <span className="font-bold text-purple-600">1.250+</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl flex items-center justify-between border border-emerald-100/50">
                    <span className="font-medium text-gray-800">
                      Cam kết bảo hành chất lượng
                    </span>
                    <span className="font-bold text-emerald-600">100%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Học phí chỉ từ</p>
                    <p className="text-lg font-bold text-blue-600">
                      150.000đ
                      <span className="text-xs font-normal text-gray-500">
                        /giờ
                      </span>
                    </p>
                  </div>
                  <a
                    href="#trial_section"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-purple-500/25 transition"
                  >
                    Đăng Ký Học Thử →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE-COLUMN COMPARISON SECTION */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Thấu hiểu nỗi lo của ba mẹ,{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                mang đến giải pháp toàn diện
              </span>
            </h2>
            <p className="mt-3 text-gray-600 text-sm sm:text-base">
              EduTutor đồng hành từng bước giúp các em vượt qua rào cản học tập
              và phát huy tối đa năng lực cá nhân.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1: Khó khăn */}
            <div className="bg-red-50/40 border-2 border-red-100 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 text-2xl mb-5">
                ⚠️
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                Con đang gặp khó khăn trong học tập
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-5">
                Những rào cản khiến việc học trở nên áp lực và kém hiệu quả:
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Mất gốc kiến thức từ sớm, hổng bài cơ bản</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Ngại hỏi thầy cô, bạn bè khi chưa hiểu bài</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Học nhiều thời gian nhưng điểm số chưa cải thiện</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Loay hoay với phương pháp tự học chưa đúng</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Thiếu người đồng hành định hướng và truyền lửa</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Lợi ích gia sư */}
            <div className="bg-blue-50/40 border-2 border-blue-100 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-2xl mb-5">
                💡
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                Gia sư phù hợp giúp con tiến bộ mỗi ngày
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-5">
                Sự thay đổi tích cực khi có người thầy đồng hành 1 kèm 1:
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Học đúng theo năng lực và tốc độ tiếp thu của con</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Có người theo sát, giải đáp tận gốc mọi thắc mắc</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Tự tin hơn khi làm bài kiểm tra và phát biểu</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Cải thiện điểm số từng bước vững chắc</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>
                    Hình thành thói quen và phương pháp tự học khoa học
                  </span>
                </li>
              </ul>
            </div>

            {/* Card 3: Cam kết EduTutor */}
            <div className="bg-purple-50/40 border-2 border-purple-100 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-2xl mb-5">
                🚀
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                EduTutor giúp ba mẹ an tâm tuyệt đối
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-5">
                Dịch vụ chuyên nghiệp, minh bạch và đảm bảo quyền lợi tối đa:
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">★</span>
                  <span>Hồ sơ gia sư minh bạch, xác minh bằng cấp kỹ càng</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">★</span>
                  <span>Học thử 01 buổi miễn phí trước khi quyết định</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">★</span>
                  <span>Đổi gia sư miễn phí 100% nếu chưa phù hợp</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">★</span>
                  <span>Kết nối nhanh chóng trong 0 - 3 ngày làm việc</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-600 font-bold">★</span>
                  <span>Học phí thanh toán cuối tháng rõ ràng, tiện lợi</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 4-STEP PROCESS SECTION */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-wider">
              QUY TRÌNH KẾT NỐI
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">
              4 Bước đơn giản để tìm gia sư giỏi cho con
            </h2>
            <p className="mt-3 text-gray-600 text-sm sm:text-base">
              Quy trình tinh gọn, nhanh chóng và đảm bảo trải nghiệm tốt nhất
              cho gia đình.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition relative">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Duyệt chọn gia sư
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Lọc gia sư theo môn học, khu vực, trình độ và xem hồ sơ đánh giá
                chi tiết từ các phụ huynh khác.
              </p>
              <ul className="text-xs text-gray-500 space-y-1.5">
                <li>• Chọn môn học &amp; lớp</li>
                <li>• Xem kinh nghiệm &amp; bằng cấp</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition relative">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Gửi yêu cầu kết nối
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Chia sẻ thông tin mục tiêu học tập và thời gian rảnh. EduTutor
                sẽ xác nhận và tư vấn trong 24h.
              </p>
              <ul className="text-xs text-gray-500 space-y-1.5">
                <li>• Tư vấn gia sư thích hợp nhất</li>
                <li>• Thống nhất lịch học linh hoạt</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-pink-300 hover:shadow-md transition relative">
              <div className="w-10 h-10 rounded-full bg-pink-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Học thử &amp; Đánh giá
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Trải nghiệm 01 buổi học thử miễn phí để đánh giá mức độ tương
                thích và phương pháp giảng dạy.
              </p>
              <ul className="text-xs text-gray-500 space-y-1.5">
                <li>• Học thử 01 buổi 0 đồng</li>
                <li>• Đổi gia sư nếu chưa ưng ý</li>
              </ul>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-emerald-300 hover:shadow-md transition relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                04
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Bắt đầu đồng hành
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Xây dựng lộ trình học tập cá nhân hóa, theo dõi tiến độ và nhận
                báo cáo định kỳ.
              </p>
              <ul className="text-xs text-gray-500 space-y-1.5">
                <li>• Lộ trình bám sát mục tiêu</li>
                <li>• Báo cáo tiến bộ định kỳ</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/tutors">
              <Button size="lg" className="shadow-lg shadow-blue-500/20 px-8">
                Khám phá danh sách gia sư ngay →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. POPULAR SUBJECT CATEGORIES GRID */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-wider">
                DANH MỤC MÔN HỌC
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">
                Đáp ứng mọi nhu cầu học tập của học sinh
              </h2>
            </div>
            <Link
              href="/tutors"
              className="mt-4 md:mt-0 text-sm font-bold text-blue-600 hover:text-purple-600 transition inline-flex items-center gap-1"
            >
              Xem tất cả môn học <span>→</span>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjectCategories.map((cat) => (
              <div
                key={cat.id}
                className="group flex flex-col justify-between bg-gray-50/70 border border-gray-100 rounded-2xl p-6 hover:bg-white hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-gray-100 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    {cat.desc}
                  </p>
                  <ul className="space-y-1.5 mb-6 text-xs text-gray-500">
                    {cat.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-blue-500">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/tutors?subject=${encodeURIComponent(cat.subject)}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-white border border-gray-200 text-center text-xs font-bold text-gray-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition shadow-xs"
                >
                  Xem gia sư môn này →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. STATS & TRUST NUMBERS */}
      <section className="py-14 sm:py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-white/15">
            <div className="p-2">
              <div className="text-3xl sm:text-5xl font-extrabold mb-1">
                3.000+
              </div>
              <div className="text-blue-100 text-xs sm:text-sm font-medium">
                Gia đình tin dùng
              </div>
            </div>
            <div className="p-2">
              <div className="text-3xl sm:text-5xl font-extrabold mb-1">
                98%
              </div>
              <div className="text-blue-100 text-xs sm:text-sm font-medium">
                Phụ huynh hài lòng
              </div>
            </div>
            <div className="p-2">
              <div className="text-3xl sm:text-5xl font-extrabold mb-1">
                500+
              </div>
              <div className="text-blue-100 text-xs sm:text-sm font-medium">
                Gia sư tuyển chọn
              </div>
            </div>
            <div className="p-2">
              <div className="text-3xl sm:text-5xl font-extrabold mb-1">
                4.9★
              </div>
              <div className="text-blue-100 text-xs sm:text-sm font-medium">
                Điểm đánh giá trung bình
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PARENT & STUDENT TESTIMONIALS */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-wider">
              ĐÁNH GIÁ THỰC TẾ
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">
              Phụ huynh &amp; Học sinh nói gì về EduTutor?
            </h2>
            <p className="mt-3 text-gray-600 text-sm sm:text-base">
              Hàng ngàn lời nhận xét chân thực từ các bậc phụ huynh đã tin tưởng
              lựa chọn gia sư của chúng tôi.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-3 text-sm">
                    {"★".repeat(t.rating)}
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-6 italic">
                    &ldquo;{t.content}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarColor} text-white font-bold flex items-center justify-center text-sm shrink-0`}
                  >
                    {t.name.charAt(t.name.indexOf(" ") + 1) || t.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                      {t.name}
                    </h4>
                    <p className="text-2xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. INTERACTIVE CONSULTATION & FREE TRIAL FORM */}
      <section id="trial_section" className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl text-white p-6 sm:p-10 lg:p-12 shadow-2xl shadow-blue-500/20">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              {/* Left Info */}
              <div className="lg:col-span-5 space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wide">
                  ĐỒNG HÀNH 1 KÈM 1
                </span>
                <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                  Đăng ký tư vấn &amp; Học thử miễn phí
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
                  Để lại nhu cầu của con, chuyên viên EduTutor sẽ liên hệ trong{" "}
                  <strong>15 phút</strong> để phân tích học lực và đề xuất gia
                  sư phù hợp nhất.
                </p>

                <div className="pt-4 space-y-3 text-xs sm:text-sm text-blue-50">
                  <div className="flex items-center gap-2">
                    <span>✓</span>{" "}
                    <span>Học thử 01 buổi đánh giá trình độ miễn phí</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✓</span>{" "}
                    <span>
                      Tư vấn lộ trình học cá nhân hóa theo từng mục tiêu
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✓</span>{" "}
                    <span>
                      Được quyền đổi gia sư miễn phí nếu chưa hài lòng
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Form */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-7 text-gray-900 shadow-xl">
                {isSubmitted ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto">
                      ✓
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Đăng ký thành công!
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto">
                      Cảm ơn bạn! Đội ngũ tư vấn EduTutor sẽ liên hệ lại với bạn
                      trong thời gian sớm nhất qua số điện thoại đã cung cấp.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="mt-4 text-xs font-bold text-blue-600 hover:underline"
                    >
                      Gửi thêm yêu cầu khác
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleConsultationSubmit}
                    className="space-y-3.5"
                  >
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Họ tên phụ huynh / học sinh *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fullName: e.target.value,
                            })
                          }
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Số điện thoại liên hệ *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ví dụ: 0912 345 678"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Môn học cần tìm gia sư
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subject: e.target.value,
                            })
                          }
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Lớp / Trình độ học sinh
                        </label>
                        <select
                          value={formData.grade}
                          onChange={(e) =>
                            setFormData({ ...formData, grade: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
                          <option value="Tiểu học (Lớp 1-5)">
                            Tiểu học (Lớp 1-5)
                          </option>
                          <option value="THCS (Lớp 6-8)">THCS (Lớp 6-8)</option>
                          <option value="Lớp 9 (Luyện thi vào 10)">
                            Lớp 9 (Luyện thi vào 10)
                          </option>
                          <option value="THPT (Lớp 10-11)">
                            THPT (Lớp 10-11)
                          </option>
                          <option value="Lớp 12 (Ôn thi THPT QG)">
                            Lớp 12 (Ôn thi THPT QG)
                          </option>
                          <option value="Luyện thi IELTS/TOEIC">
                            Luyện thi IELTS/TOEIC
                          </option>
                          <option value="Người đi làm / Sinh viên">
                            Người đi làm / Sinh viên
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Ghi chú thêm về học lực hoặc nhu cầu đặc biệt
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ví dụ: Con cần lấy lại gốc môn Toán, học 2 buổi/tuần vào buổi tối..."
                        value={formData.note}
                        onChange={(e) =>
                          setFormData({ ...formData, note: e.target.value })
                        }
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      size="lg"
                      fullWidth
                      className="h-11 shadow-md shadow-blue-500/20 font-bold text-sm"
                    >
                      {isSubmitting
                        ? "Đang gửi thông tin..."
                        : "Nhận tư vấn & Học thử miễn phí →"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BLOG / EDUCATIONAL TIPS CORNER */}
      <section className="py-16 sm:py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-wider">
                GÓC CHIA SẺ &amp; KIẾN THỨC
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">
                Cẩm nang học tập &amp; Bí quyết chọn gia sư
              </h2>
            </div>
            <Link
              href="/tutors"
              className="mt-4 md:mt-0 text-sm font-bold text-blue-600 hover:text-purple-600 transition inline-flex items-center gap-1"
            >
              Xem tất cả bài viết <span>→</span>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between text-2xs text-gray-500 mb-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">
                      {post.tag}
                    </span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 hover:text-blue-600 transition mb-2">
                    <Link href="/tutors">{post.title}</Link>
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
                <div className="px-5 pb-5 pt-2 border-t border-gray-50">
                  <Link
                    href="/tutors"
                    className="text-xs font-bold text-blue-600 hover:text-purple-600 inline-flex items-center gap-1"
                  >
                    Đọc tiếp <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 9. QUICK CONTACT & SUPPORT BAR */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Cần hỗ trợ tư vấn gia sư trực tiếp?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Đội ngũ cố vấn học tập EduTutor luôn sẵn sàng lắng nghe và hỗ
                trợ gia đình 24/7.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:0369148660"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
              >
                <span>📞</span>
                <span>Hotline: 0369 148 660</span>
              </a>
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-bold hover:border-blue-500 hover:text-blue-600 transition shadow-xs"
              >
                <span>💬</span>
                <span>Tư vấn qua Zalo</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
