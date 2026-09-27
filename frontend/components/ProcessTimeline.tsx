"use client";

import {
  SearchOutlined,
  SendOutlined,
  StarFilled,
  CheckCircleFilled,
  ArrowRightOutlined,
} from "@ant-design/icons";

interface TimelineStep {
  stepNumber: number;
  title: string;
  icon: React.ReactNode;
  bullets: string[];
  align: "left" | "right";
  cardClass: string;
  titleClass: string;
  dotClass: string;
}

const STEPS: TimelineStep[] = [
  {
    stepNumber: 1,
    title: "Bước 1: Duyệt chọn gia sư",
    icon: <SearchOutlined />,
    bullets: [
      "Chọn môn học và lớp học cần hỗ trợ",
      "Lọc theo khu vực và giới tính gia sư",
      "Xem hồ sơ, trình độ và kinh nghiệm",
    ],
    align: "right",
    cardClass: "bg-[#cceeff]",
    titleClass: "text-[#1877f2]",
    dotClass: "border-[#1877f2]",
  },
  {
    stepNumber: 2,
    title: "Bước 2: Gửi yêu cầu mời dạy",
    icon: <SendOutlined />,
    bullets: [
      "Cung cấp thông tin lớp học và liên hệ",
      "EduTutor xác nhận và hỗ trợ kết nối",
      "Gia sư liên hệ trao đổi và nhận lớp",
    ],
    align: "left",
    cardClass: "bg-[#fff8e8]",
    titleClass: "text-[#f59e0b]",
    dotClass: "border-[#f59e0b]",
  },
  {
    stepNumber: 3,
    title: "Bước 3: Học thử & đánh giá",
    icon: <StarFilled />,
    bullets: [
      "Học thử trước khi bắt đầu đồng hành",
      "Đánh giá sự phù hợp với học sinh",
      "Hỗ trợ đổi gia sư nếu cần thiết",
    ],
    align: "right",
    cardClass: "bg-[#feecec]",
    titleClass: "text-[#f24444]",
    dotClass: "border-[#f24444]",
  },
  {
    stepNumber: 4,
    title: "Bước 4: Bắt đầu đồng hành",
    icon: <CheckCircleFilled />,
    bullets: [
      "Xây dựng lộ trình học tập phù hợp",
      "Gia sư theo sát quá trình tiến bộ",
      "Đồng hành cùng con lâu dài",
    ],
    align: "left",
    cardClass: "bg-[#dff7e8]",
    titleClass: "text-[#22c55e]",
    dotClass: "border-[#22c55e]",
  },
];

export function ProcessTimeline() {
  const handleScrollToRegister = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="timeline" className="relative overflow-hidden bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Hành trình chọn gia sư phù hợp
          </h2>
          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            Chỉ với 4 bước đơn giản, ba mẹ dễ dàng chọn gia sư cho con
          </p>
        </div>

        <div className="process-timeline relative mx-auto max-w-4xl">
          {/* Timeline Track: nối chính xác từ tâm điểm bước 1 đến tâm điểm bước 4 */}
          <div
            className="absolute bottom-[88px] left-[13px] top-[88px] sm:bottom-[94px] sm:top-[94px] w-[2px] -translate-x-1/2 bg-[#ead9c2] md:left-1/2 md:-translate-x-1/2 z-[2]"
            aria-hidden="true"
          >
            {/* Dòng tiến trình động màu gradient rõ nét */}
            <div className="timeline-progress-fill h-full w-full" />

            {/* Đầu sáng chạy 15s và nghỉ 2s ở cuối trước khi lặp lại */}
            <span className="timeline-glow-head absolute left-1/2" aria-hidden="true" />
          </div>

          <ol className="relative m-0 list-none p-0 z-[3]">
            {STEPS.map((step) => {
              const isRight = step.align === "right";

              return (
                <li
                  key={step.stepNumber}
                  className="relative flex min-h-[176px] sm:min-h-[188px] items-center py-4"
                >
                  {/* Bốn điểm tròn: tâm trắng, viền màu, không số, căn chính giữa đường timeline */}
                  <span
                    className="absolute left-[13px] top-1/2 z-[6] h-[16px] w-[16px] -translate-x-1/2 -translate-y-1/2 md:left-1/2 pointer-events-none"
                    aria-hidden="true"
                  >
                    <span
                      className={`timeline-dot-${step.stepNumber} block h-full w-full rounded-full border-[3px] bg-white ${step.dotClass}`}
                    />
                  </span>

                  <article
                    tabIndex={0}
                    className={`process-card group relative ml-10 w-[calc(100%-2.5rem)] overflow-hidden rounded-[24px] px-5 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-7 md:w-[calc(50%-3rem)] z-[1] ${step.cardClass} ${
                      isRight ? "md:ml-[calc(50%+3rem)]" : "md:ml-0"
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[104px] opacity-[0.055] ${step.titleClass}`}
                      aria-hidden="true"
                    >
                      {step.icon}
                    </div>

                    <div className="relative z-10">
                      <div className={`mb-3 flex items-center gap-2.5 ${step.titleClass}`}>
                        <span
                          className={`timeline-icon-step-${step.stepNumber} flex shrink-0 items-center justify-center text-xl sm:text-2xl`}
                          aria-hidden="true"
                        >
                          {step.icon}
                        </span>
                        <h3 className="text-base font-semibold leading-snug sm:text-lg">
                          {step.title}
                        </h3>
                      </div>

                      <ul className="space-y-2 pl-0">
                        {step.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="relative pl-4 text-xs leading-relaxed text-slate-600 sm:text-sm"
                          >
                            <span className="absolute left-0 top-[0.65em] h-1 w-1 rounded-full bg-slate-800" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-10 text-center sm:mt-12">
          <a
            href="#register"
            onClick={handleScrollToRegister}
            className="group inline-flex items-center gap-2.5 rounded-full bg-slate-950 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-blue-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span>Chọn gia sư phù hợp ngay</span>
            <ArrowRightOutlined className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
