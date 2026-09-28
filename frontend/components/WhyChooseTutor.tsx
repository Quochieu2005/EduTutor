"use client";

import Image from "next/image";
import { CheckCircleFilled, ExclamationCircleFilled } from "@ant-design/icons";

interface StepCard {
  tag: string;
  tagColor: string;
  tagIcon: React.ReactNode;
  title: string;
  bullets: string[];
  imageSrc: string;
  imageAlt: string;
}

const CARDS: StepCard[] = [
  {
    tag: "THỰC TRẠNG",
    tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    tagIcon: <ExclamationCircleFilled className="text-blue-600 mr-1.5" />,
    title: "Con đang gặp khó khăn trong học tập",
    bullets: [
      "Mất gốc kiến thức từ sớm",
      "Ngại hỏi khi không hiểu bài",
      "Học nhiều nhưng chưa hiệu quả",
      "Loay hoay với phương pháp học",
      "Thiếu sự đồng hành và định hướng",
    ],
    imageSrc: "/assets/card-struggle.png",
    imageAlt: "Học sinh gặp khó khăn trong học tập",
  },
  {
    tag: "HIỆU QUẢ",
    tagColor: "bg-blue-100 text-blue-800 border-blue-300",
    tagIcon: <CheckCircleFilled className="text-blue-600 mr-1.5" />,
    title: "Gia sư phù hợp giúp con tiến bộ mỗi ngày",
    bullets: [
      "Học đúng theo năng lực",
      "Có người theo sát và đồng hành",
      "Tự tin hơn khi học và hỏi bài",
      "Cải thiện kiến thức từng bước",
      "Hình thành thói quen tự học tốt",
    ],
    imageSrc: "/assets/card-progress.png",
    imageAlt: "Gia sư đồng hành giúp học sinh tiến bộ",
  },
  {
    tag: "GIẢI PHÁP",
    tagColor: "bg-blue-600 text-white border-blue-600",
    tagIcon: <CheckCircleFilled className="text-white mr-1.5" />,
    title: "EduTutor giúp ba mẹ tìm đúng gia sư cho con",
    bullets: [
      "Chọn gia sư phù hợp với con",
      "Học thử miễn phí trước khi bắt đầu",
      "Đổi gia sư miễn phí nếu chưa phù hợp",
      "Kết nối nhanh 0–3 ngày",
      "Học phí thanh toán cuối tháng",
    ],
    imageSrc: "/assets/card-solution.png",
    imageAlt: "EduTutor kết nối giải pháp gia sư tối ưu",
  },
];

export function WhyChooseTutor() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Giải Pháp Toàn Diện
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tìm gia sư phù hợp cho con
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-3">
            Ba mẹ bận rộn, con cần một người đồng hành trong học tập
          </p>
        </div>

        {/* 3 Cards: 3 columns on desktop, 1 column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {CARDS.map((card, idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-blue-100 bg-white shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between group"
            >
              <div>
                {/* Tag Badge */}
                <div className="mb-4">
                  <span
                    className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${card.tagColor}`}
                  >
                    {card.tagIcon}
                    {card.tag}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug mb-5 group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h3>

                {/* Bullet List */}
                <ul className="space-y-3 mb-8">
                  {card.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                      <CheckCircleFilled className="text-blue-500 text-sm mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Illustration */}
              <div className="relative w-full h-36 sm:h-40 rounded-2xl overflow-hidden bg-blue-50/50 flex items-center justify-center p-2 border border-blue-50">
                <Image
                  src={card.imageSrc}
                  alt={card.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 380px"
                  className="object-contain object-bottom hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
