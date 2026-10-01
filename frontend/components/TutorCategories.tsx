"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LeftOutlined,
  RightOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

import { edututorApi, type Subject } from "@/lib/edututor-api";
import { TUTOR_CATEGORIES, type TutorCategoryItem } from "@/lib/tutor-filter-mapping";

const CARD_HOLD_MS = 1000;
const SLIDE_TRANSITION_MS = 300;
const DEFAULT_SUBJECT_IMAGE = "/assets/sub-toantuduy.png";

function subjectImage(slug: string) {
  if (slug.includes("tieng-anh")) return "/assets/sub-tienganh.png";
  if (slug.includes("ielts")) return "/assets/sub-ielts.png";
  if (slug.includes("ngu-van") || slug.includes("van")) return "/assets/sub-nguvan.png";
  if (slug.includes("vat-ly") || slug.includes("vat-li")) return "/assets/sub-vatly.png";
  if (slug.includes("hoa")) return "/assets/sub-hoahoc.png";
  if (slug.includes("toan")) return "/assets/sub-toantuduy.png";
  return DEFAULT_SUBJECT_IMAGE;
}

function toCategory(subject: Subject): TutorCategoryItem {
  const metadata = TUTOR_CATEGORIES.find((item) => item.filterSubjectSlug === subject.slug);
  const tutorCount = subject.tutor_count ?? 0;
  return {
    id: `subject-${subject.id}`,
    slug: subject.slug,
    title: metadata?.title ?? `Gia sư ${subject.name}`,
    imageSrc: metadata?.imageSrc ?? subjectImage(subject.slug),
    filterSubjectSlug: subject.slug,
    bullets: metadata?.bullets ?? [
      tutorCount > 0 ? `${tutorCount.toLocaleString("vi-VN")} gia sư đang hoạt động` : "Đang cập nhật gia sư",
      subject.level ? `Hỗ trợ ${subject.level}` : "Đa dạng cấp học",
      "Học online và trực tiếp",
    ],
  };
}

export function TutorCategories() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tutorCount, setTutorCount] = useState<number | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isCurrent = true;
    edututorApi.subjects({ page_size: 100 })
      .then((page) => {
        if (isCurrent) {
          setSubjects(page.results);
          setIsLoadingSubjects(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError(true);
          setIsLoadingSubjects(false);
        }
      });
    edututorApi.tutors({ page_size: 1 })
      .then((page) => {
        if (isCurrent) setTutorCount(page.count);
      })
      .catch(() => undefined);
    return () => { isCurrent = false; };
  }, []);

  const categories = useMemo(() => subjects.map(toCategory), [subjects]);

  const getCardStep = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return 340;
    const firstCard = container.querySelector(".tutor-category-card") as HTMLElement | null;
    if (!firstCard) return 340;

    const style = window.getComputedStyle(container);
    const gap = Number.parseFloat(style.columnGap || style.gap) || 20;
    return firstCard.offsetWidth + gap;
  }, []);

  const scrollOneCard = useCallback((direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction === "left" ? -getCardStep() : getCardStep(),
      behavior: "smooth",
    });
  }, [getCardStep]);

  const clearAllTimers = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };

  const scheduleNextAutoplayRef = useRef<((delay?: number) => void) | null>(null);

  // Autoplay with chained setTimeout:
  // 1. Dừng ở card hiện tại 1.000ms
  // 2. Trượt sang card tiếp theo (~300ms)
  // 3. Chờ quá trình trượt hoàn tất (300ms)
  // 4. Bắt đầu lại bộ đếm 1.000ms
  const scheduleNextAutoplay = useCallback((delay = CARD_HOLD_MS) => {
    clearAllTimers();

    autoTimerRef.current = setTimeout(() => {
      if (isDraggingRef.current) return;

      scrollOneCard("right");

      transitionTimerRef.current = setTimeout(() => {
        scheduleNextAutoplayRef.current?.(CARD_HOLD_MS);
      }, SLIDE_TRANSITION_MS);
    }, delay);
  }, [scrollOneCard]);

  useEffect(() => {
    scheduleNextAutoplayRef.current = scheduleNextAutoplay;
  }, [scheduleNextAutoplay]);

  // Start autoplay loop on mount, cleanup on unmount
  useEffect(() => {
    scheduleNextAutoplay(CARD_HOLD_MS);
    return () => clearAllTimers();
  }, [scheduleNextAutoplay]);

  // Manual scroll buttons
  const handleManualScroll = (direction: "left" | "right") => {
    clearAllTimers();
    scrollOneCard(direction);
    transitionTimerRef.current = setTimeout(() => {
      scheduleNextAutoplay(CARD_HOLD_MS);
    }, SLIDE_TRANSITION_MS);
  };

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    clearAllTimers();
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      scheduleNextAutoplay(CARD_HOLD_MS);
    }
  };

  const handleTouchStart = () => {
    clearAllTimers();
    isDraggingRef.current = true;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    scheduleNextAutoplay(CARD_HOLD_MS);
  };

  return (
    <section
      id="tutors"
      className="py-16 sm:py-20 bg-slate-50 border-y border-blue-50 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Title and Carousel Navigation Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
              Chuyên Môn Đa Dạng
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Đội ngũ gia sư tại EduTutor
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2">
              {tutorCount === null
                ? "Đội ngũ gia sư được cập nhật trực tiếp từ hệ thống Admin."
                : `${tutorCount.toLocaleString("vi-VN")} gia sư kinh nghiệm, đa dạng môn học và cấp học`}
            </p>
          </div>

          {/* Carousel Arrows with Ant Design Icons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleManualScroll("left")}
              aria-label="Cuộn sang trái"
              className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center text-sm shadow-xs transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
            >
              <LeftOutlined />
            </button>
            <button
              type="button"
              onClick={() => handleManualScroll("right")}
              aria-label="Cuộn sang phải"
              className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center text-sm shadow-xs transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
            >
              <RightOutlined />
            </button>
          </div>
        </div>

        {/* Carousel Container with Infinite Looping & Dragging */}
        <div className="tutor-carousel-shell relative -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="no-scrollbar flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto pb-4 pt-2 select-none active:cursor-grabbing"
            style={{ scrollBehavior: "auto" }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/tutors?subject=${encodeURIComponent(cat.filterSubjectSlug)}`}
                className="tutor-category-card group flex w-[280px] shrink-0 snap-start select-none flex-col justify-between rounded-3xl border border-blue-100 bg-white p-5 shadow-xs transition-all duration-300 focus-visible:border-blue-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 sm:w-[320px]"
              >
              <div>
                {/* Subject Banner Illustration */}
                <div className="relative w-full h-32 rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-slate-100">
                  <Image
                    src={cat.imageSrc}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 768px) 280px, 320px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                </div>

                {/* Subject Title */}
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {cat.title}
                </h3>

                {/* 3 Highlights */}
                <ul className="mt-3.5 space-y-2 mb-6">
                  {cat.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircleFilled className="text-blue-500 text-xs mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* View Tutors Action (styled text inside Link) */}
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition-all group-hover:gap-3 group-hover:text-blue-800">
                <span>Xem gia sư</span>
                <ArrowRightOutlined className="text-xs transition-transform group-hover:translate-x-0.5" />
              </div>
              </Link>
            ))}
            {isLoadingSubjects && categories.length === 0 && (
              <p className="w-full py-12 text-center text-sm text-slate-500">
                Đang tải danh sách môn học...
              </p>
            )}
            {loadError && categories.length === 0 && (
              <p className="w-full py-12 text-center text-sm text-slate-500">
                Chưa tải được danh sách môn học từ Admin.
              </p>
            )}
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="mt-12 text-center">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-blue-600/20 transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span>Xem tất cả gia sư</span>
            <ArrowRightOutlined />
          </Link>
        </div>
      </div>
    </section>
  );
}
