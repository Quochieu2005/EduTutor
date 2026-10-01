"use client";

import { useEffect, useState } from "react";
import { edututorApi, type Banner } from "@/lib/edututor-api";
import {
  TeamOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BookOutlined,
} from "@ant-design/icons";

interface BenefitCard {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const BENEFIT_CARDS: BenefitCard[] = [
  {
    title: "Đội ngũ gia sư chất lượng",
    description: "100% gia sư được kiểm định bằng cấp, chuyên môn giỏi và tận tâm giảng dạy.",
    icon: <TeamOutlined className="text-2xl text-blue-600" />,
  },
  {
    title: "Thời gian học linh hoạt",
    description: "Chủ động sắp xếp lịch học sáng, chiều hoặc tối theo thời gian biểu của học sinh.",
    icon: <ClockCircleOutlined className="text-2xl text-blue-600" />,
  },
  {
    title: "Kinh nghiệm và thành tích",
    description: "Gia sư dày dặn kinh nghiệm, từng đạt giải thưởng và giúp nhiều học sinh tiến bộ vượt bậc.",
    icon: <TrophyOutlined className="text-2xl text-blue-600" />,
  },
  {
    title: "Chương trình học tối ưu",
    description: "Giáo án cá nhân hóa theo đúng năng lực, bù đắp lỗ hổng kiến thức và nâng cao điểm số.",
    icon: <BookOutlined className="text-2xl text-blue-600" />,
  },
];

export function HeroBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isLoadingBanner, setIsLoadingBanner] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    edututorApi.banners()
      .then((items) => {
        if (isCurrent) setBanner(items[0] ?? null);
      })
      .catch(() => {
        if (isCurrent) setBanner(null);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingBanner(false);
      });
    return () => { isCurrent = false; };
  }, []);

  const bannerContent = banner ? (
    <div className="relative w-full aspect-[16/7] sm:aspect-[21/9] min-h-[260px] sm:min-h-[380px] lg:min-h-[460px]">
      {/* Banner comes only from the public API, never from a bundled mock image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.image} alt={banner.title || "Banner EduTutor"} className="h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-blue-950/5 pointer-events-none" />
    </div>
  ) : (
    <div className="flex min-h-[260px] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 text-center sm:min-h-[380px]">
      <div className="max-w-md space-y-2">
        <p className="text-base font-bold text-slate-800">{isLoadingBanner ? "Đang tải banner..." : "Chưa có banner đang hiển thị"}</p>
        {!isLoadingBanner && <p className="text-sm text-slate-500">Quản trị viên cần tạo banner có trạng thái Active và nằm trong thời gian hiển thị.</p>}
      </div>
    </div>
  );

  return (
    <section id="hero" className="relative w-full bg-slate-50 pt-2 pb-12 sm:pb-16 overflow-hidden">
      {/* Banner Container: Full width, preserves aspect ratio, responsive */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-blue-900/10 border border-blue-100 bg-white">
          {banner?.link_url ? <a href={banner.link_url}>{bannerContent}</a> : bannerContent}
        </div>

        {/* 4 Benefit Cards: Overlapping / Positioned underneath banner */}
        <div className="relative -mt-6 sm:-mt-10 lg:-mt-14 z-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {BENEFIT_CARDS.map((card, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-blue-100/80 p-5 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-600 transition-colors flex items-center justify-center mb-3.5 shadow-2xs group-hover:text-white">
                    <span className="group-hover:text-white transition-colors">
                      {card.icon}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
