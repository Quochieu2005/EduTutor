"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  LeftOutlined,
  RightOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

import { edututorApi, type Subject } from "@/lib/edututor-api";
import { getAuthSession } from "@/lib/auth-session";
import { TUTOR_CATEGORIES, type TutorCategoryItem } from "@/lib/tutor-filter-mapping";

const CARD_HOLD_MS = 2200;
const SLIDE_TRANSITION_MS = 650;
const emptySubscribe = () => () => {};
function toCategory(subject: Subject): TutorCategoryItem {
  const metadata = TUTOR_CATEGORIES.find((item) => item.filterSubjectSlug === subject.slug);
  const tutorCount = subject.tutor_count ?? 0;
  return {
    id: `subject-${subject.id}`,
    slug: subject.slug,
    title: metadata?.title ?? `Gia sư ${subject.name}`,
    imageSrc: metadata?.imageSrc ?? "",
    filterSubjectSlug: subject.slug,
    bullets: metadata?.bullets ?? [
      tutorCount > 0 ? `${tutorCount.toLocaleString("vi-VN")} gia sư đang hoạt động` : "Đang cập nhật gia sư",
      subject.level ? `Hỗ trợ ${subject.level}` : "Đa dạng cấp học",
      "Học online và trực tiếp",
    ],
  };
}

const subjectThemes = {
  math: { surface: "bg-blue-600", soft: "bg-blue-400/35", ink: "text-white", glyph: "∑", label: "Tư duy logic" },
  literature: { surface: "bg-amber-500", soft: "bg-orange-300/45", ink: "text-amber-950", glyph: "Aa", label: "Ngôn ngữ & diễn đạt" },
  technology: { surface: "bg-indigo-600", soft: "bg-cyan-300/30", ink: "text-white", glyph: "</>", label: "Công nghệ & sáng tạo" },
  language: { surface: "bg-emerald-600", soft: "bg-teal-300/35", ink: "text-white", glyph: "EN", label: "Giao tiếp & hội nhập" },
  science: { surface: "bg-violet-600", soft: "bg-fuchsia-300/30", ink: "text-white", glyph: "⚗", label: "Khám phá khoa học" },
} as const;

const generatedThemes = [
  { surface: "bg-sky-600", soft: "bg-cyan-300/30", ink: "text-white" },
  { surface: "bg-rose-600", soft: "bg-pink-300/30", ink: "text-white" },
  { surface: "bg-teal-600", soft: "bg-emerald-300/30", ink: "text-white" },
  { surface: "bg-orange-500", soft: "bg-amber-200/40", ink: "text-orange-950" },
  { surface: "bg-purple-600", soft: "bg-violet-300/30", ink: "text-white" },
  { surface: "bg-cyan-700", soft: "bg-sky-300/30", ink: "text-white" },
  { surface: "bg-lime-600", soft: "bg-lime-200/35", ink: "text-lime-950" },
  { surface: "bg-slate-700", soft: "bg-blue-300/25", ink: "text-white" },
] as const;

function hashSubject(value: string) {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function subjectInitials(title: string) {
  const words = title.replace(/^Gia sư\s*/i, "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => Array.from(word)[0]).join("").toLocaleUpperCase("vi-VN") || "ED";
}

function subjectTheme(slug: string, title: string) {
  const value = `${slug} ${title}`.toLowerCase();
  if (value.includes("toan")) return subjectThemes.math;
  if (value.includes("van") || value.includes("ngu-van")) return subjectThemes.literature;
  if (value.includes("tin") || value.includes("cong-nghe") || value.includes("lap-trinh")) return subjectThemes.technology;
  if (value.includes("anh") || value.includes("ielts") || value.includes("ngoai-ngu")) return subjectThemes.language;
  if (value.includes("ly") || value.includes("hoa") || value.includes("sinh")) return subjectThemes.science;
  const generated = generatedThemes[hashSubject(slug || title) % generatedThemes.length];
  return {
    ...generated,
    glyph: subjectInitials(title),
    label: `Khám phá ${title.replace(/^Gia sư\s*/i, "")}`,
  };
}

function SubjectBanner({ category }: { category: TutorCategoryItem }) {
  const visual = subjectTheme(category.filterSubjectSlug, category.title);
  return (
    <div className={`relative mb-5 h-36 w-full overflow-hidden rounded-2xl ${visual.surface} ${visual.ink}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div aria-hidden="true" className={`absolute -right-8 -top-10 h-32 w-32 rounded-full ${visual.soft}`} />
      <div aria-hidden="true" className="absolute -bottom-12 right-14 h-28 w-28 rounded-full border-[18px] border-white/10" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="max-w-[180px] text-xs font-semibold leading-5 opacity-90">{visual.label}</span>
          <span aria-hidden="true" className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm">EduTutor</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="truncate text-sm font-bold opacity-90">{category.title.replace(/^Gia sư\s*/i, "")}</span>
          <span aria-hidden="true" className="text-4xl font-black tracking-tighter drop-shadow-sm">{visual.glyph}</span>
        </div>
      </div>
    </div>
  );
}

async function loadAllSubjects() {
  const firstPage = await edututorApi.subjects({ page: 1, page_size: 100 });
  const subjects = [...firstPage.results];
  let pageNumber = 2;
  let hasNextPage = Boolean(firstPage.next);
  while (hasNextPage) {
    const nextPage = await edututorApi.subjects({ page: pageNumber, page_size: 100 });
    subjects.push(...nextPage.results);
    hasNextPage = Boolean(nextPage.next);
    pageNumber += 1;
  }
  return subjects;
}

export function TutorCategories() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isTutorAccount = mounted && getAuthSession()?.actorType === "tutor";
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tutorCount, setTutorCount] = useState<number | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const dragFrameRef = useRef<number | null>(null);
  const pendingScrollLeftRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isCurrent = true;
    loadAllSubjects()
      .then((items) => {
        if (isCurrent) {
          setSubjects(items);
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
  const carouselCategories = useMemo(
    () => categories.length > 1 ? [...categories, ...categories, ...categories] : categories,
    [categories],
  );

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

  const getCycleWidth = useCallback(() => categories.length * getCardStep(), [categories.length, getCardStep]);

  const normalizeLoopPosition = useCallback(() => {
    const container = scrollRef.current;
    const cycleWidth = getCycleWidth();
    if (!container || categories.length < 2 || cycleWidth <= 0) return;
    if (container.scrollLeft >= cycleWidth * 2) container.scrollLeft -= cycleWidth;
    else if (container.scrollLeft <= 1) container.scrollLeft += cycleWidth;
  }, [categories.length, getCycleWidth]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || categories.length < 2) return;
    const frame = window.requestAnimationFrame(() => {
      container.scrollLeft = getCycleWidth();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [categories.length, getCycleWidth]);

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
      const container = scrollRef.current;
      if (!container || categories.length < 2) {
        scheduleNextAutoplayRef.current?.(CARD_HOLD_MS);
        return;
      }
      scrollOneCard("right");

      transitionTimerRef.current = setTimeout(() => {
        normalizeLoopPosition();
        scheduleNextAutoplayRef.current?.(CARD_HOLD_MS);
      }, SLIDE_TRANSITION_MS);
    }, delay);
  }, [categories.length, normalizeLoopPosition, scrollOneCard]);

  useEffect(() => {
    scheduleNextAutoplayRef.current = scheduleNextAutoplay;
  }, [scheduleNextAutoplay]);

  // Start autoplay loop on mount, cleanup on unmount
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    scheduleNextAutoplay(CARD_HOLD_MS);
    return () => {
      clearAllTimers();
      if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
    };
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
    setIsDragging(true);
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 6) hasDraggedRef.current = true;
    pendingScrollLeftRef.current = scrollLeftRef.current - walk;
    if (dragFrameRef.current === null) {
      dragFrameRef.current = window.requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = pendingScrollLeftRef.current;
        dragFrameRef.current = null;
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      normalizeLoopPosition();
      scheduleNextAutoplay(CARD_HOLD_MS);
    }
  };

  const handleTouchStart = () => {
    clearAllTimers();
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleCardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isTutorAccount) {
      event.preventDefault();
      return;
    }
    if (!hasDraggedRef.current) return;
    event.preventDefault();
    hasDraggedRef.current = false;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    normalizeLoopPosition();
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
            onScroll={() => {
              if (!isDraggingRef.current) normalizeLoopPosition();
            }}
            className={`no-scrollbar flex cursor-grab gap-5 overflow-x-auto pb-4 pt-2 select-none active:cursor-grabbing ${isDragging ? "snap-none scroll-auto" : "snap-x snap-mandatory"}`}
            style={{ scrollBehavior: "auto" }}
          >
            {carouselCategories.map((cat, index) => (
              <Link
                key={`${cat.id}-${index}`}
                href={`/tutors?subject=${encodeURIComponent(cat.filterSubjectSlug)}`}
                aria-disabled={isTutorAccount || undefined}
                aria-hidden={categories.length > 1 && (index < categories.length || index >= categories.length * 2)}
                tabIndex={isTutorAccount || (categories.length > 1 && (index < categories.length || index >= categories.length * 2)) ? -1 : undefined}
                onClick={handleCardClick}
                onDragStart={(event) => event.preventDefault()}
                className={`tutor-category-card group flex w-[280px] shrink-0 snap-start select-none flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-300 focus-visible:border-blue-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transform-none sm:w-[320px] ${isTutorAccount ? "pointer-events-none" : "hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/10"}`}
              >
              <div>
                {/* Subject Banner Illustration */}
                <SubjectBanner category={cat} />

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
              {!isTutorAccount && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition-all group-hover:gap-3 group-hover:text-blue-800">
                  <span>Xem gia sư</span>
                  <ArrowRightOutlined className="text-xs transition-transform group-hover:translate-x-0.5" />
                </div>
              )}
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
        {!isTutorAccount && <div className="mt-12 text-center">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-blue-600/20 transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span>Xem tất cả gia sư</span>
            <ArrowRightOutlined />
          </Link>
        </div>}
      </div>
    </section>
  );
}
