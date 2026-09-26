"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tutor } from "@/lib/home-mock-data";
import { TutorCard } from "./TutorCard";

interface FeaturedTutorsProps {
  tutors: Tutor[];
  onReset?: () => void;
}

export function FeaturedTutors({ tutors, onReset }: FeaturedTutorsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const startXRef = useRef(0);

  const [cardWidth, setCardWidth] = useState(280);
  const [currentIndex, setCurrentIndex] = useState(2);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const gap = 16;
  const N = tutors.length;

  // 1. Tạo danh sách có clone đầu và cuối để lặp vô hạn mượt mà
  const displayItems = useMemo(() => {
    if (N === 0) return [];
    if (N === 1) {
      return [{ tutor: tutors[0], key: tutors[0].id, isClone: false }];
    }
    // Clone 2 phần tử cuối đặt lên đầu, và 2 phần tử đầu đặt về cuối
    const clonesStart = tutors.slice(-2).map((t, idx) => ({
      tutor: t,
      key: `${t.id}-clone-start-${idx}`,
      isClone: true,
    }));
    const realItems = tutors.map((t) => ({
      tutor: t,
      key: t.id,
      isClone: false,
    }));
    const clonesEnd = tutors.slice(0, 2).map((t, idx) => ({
      tutor: t,
      key: `${t.id}-clone-end-${idx}`,
      isClone: true,
    }));

    return [...clonesStart, ...realItems, ...clonesEnd];
  }, [tutors, N]);

  // 2. Đo kích thước container bằng ResizeObserver để card hiển thị trọn vẹn
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          const perView = width < 640 ? 1 : 2;
          const computedWidth = perView === 1 ? width : Math.max(200, (width - gap) / 2);
          setCardWidth(computedWidth);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [gap]);

  // 3. Hủy timer đang chờ
  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // 4. Lên lịch chuyển card tiếp theo sau khi đã giữ đủ 1 giây (1000ms)
  const scheduleNextAdvance = useCallback(() => {
    clearHoldTimer();
    if (typeof window === "undefined" || N <= 1) return;

    if (document.hidden || isDraggingRef.current) return;

    holdTimerRef.current = setTimeout(() => {
      if (document.hidden || isDraggingRef.current) return;
      isAnimatingRef.current = true;
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 1000); // Giữ mỗi card đúng 1 giây (1000ms) trước khi chuyển
  }, [clearHoldTimer, N]);

  // 5. Chuyển sang card tiếp theo thủ công (nút Next)
  const handleNext = useCallback(() => {
    if (N <= 1 || isAnimatingRef.current) return;
    clearHoldTimer();
    isAnimatingRef.current = true;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, [N, clearHoldTimer]);

  // 6. Chuyển sang card trước đó thủ công (nút Prev)
  const handlePrev = useCallback(() => {
    if (N <= 1 || isAnimatingRef.current) return;
    clearHoldTimer();
    isAnimatingRef.current = true;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, [N, clearHoldTimer]);

  // Khi component mount hoặc danh sách tutors thay đổi:
  // Reset vị trí về card thật đầu tiên (index 2) và bắt đầu giữ 1 giây
  useEffect(() => {
    isAnimatingRef.current = false;
    clearHoldTimer();

    const raf = requestAnimationFrame(() => {
      setCurrentIndex(N >= 2 ? 2 : 0);
      setIsTransitioning(true);
      scheduleNextAdvance();
    });

    return () => {
      cancelAnimationFrame(raf);
      clearHoldTimer();
    };
  }, [tutors, N, scheduleNextAdvance, clearHoldTimer]);

  // Khi transition hoàn tất: xử lý vòng lặp vô hạn và bắt đầu chu trình giữ 1 giây
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // CHỈ xử lý khi event phát ra từ chính track carousel và property là transform
    if (e.target !== trackRef.current || e.propertyName !== "transform") {
      return;
    }

    isAnimatingRef.current = false;
    if (N < 2) return;

    if (currentIndex >= 2 + N) {
      // Vừa trượt qua clone ở cuối -> nhảy tức thì về card thật đầu tiên
      setIsTransitioning(false);
      setCurrentIndex(currentIndex - N);
    } else if (currentIndex < 2) {
      // Vừa trượt qua clone ở đầu -> nhảy tức thì về card thật cuối cùng
      setIsTransitioning(false);
      setCurrentIndex(currentIndex + N);
    }

    // Card đã căn chuẩn vào vị trí -> giữ card này đủ 1 giây trước khi chuyển tiếp
    scheduleNextAdvance();
  };

  // Kích hoạt lại transition ở frame tiếp theo sau khi đã nhảy vị trí
  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  // Tạm dừng khi tab ẩn và tiếp tục giữ 1 giây khi tab hiển thị lại
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearHoldTimer();
      } else {
        scheduleNextAdvance();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clearHoldTimer, scheduleNextAdvance]);

  // Hỗ trợ kéo chuột & vuốt chạm (Pointer Events)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (N <= 1) return;

    // Không biến thao tác bấm liên kết/nút trong card thành thao tác kéo carousel.
    // Đây là nguyên nhân nút "Xem chi tiết" đôi lúc không điều hướng được.
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, [role='button']")) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    setIsTransitioning(false);
    startXRef.current = e.clientX;
    clearHoldTimer();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const delta = e.clientX - startXRef.current;
    setDragOffset(delta);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const threshold = Math.min(cardWidth * 0.25, 60);
    setIsTransitioning(true);

    if (dragOffset < -threshold) {
      handleNext();
    } else if (dragOffset > threshold) {
      handlePrev();
    } else {
      // Thả chuột nhưng chưa vượt ngưỡng -> căn lại vị trí cũ và giữ 1 giây
      scheduleNextAdvance();
    }

    setDragOffset(0);
  };

  // Chỉ tạm dừng khi con trỏ nằm trực tiếp trên một phần tử có thể bấm.
  // Card vẫn tự chạy khi người dùng chỉ rê chuột qua vùng carousel.
  const handleInteractivePointerOver = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) clearHoldTimer();
  };

  const handleInteractivePointerOut = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) scheduleNextAdvance();
  };

  // Tính toán offset di chuyển trên track
  const effectiveIndex = N >= 2 ? currentIndex : 0;
  const currentOffset = effectiveIndex * (cardWidth + gap) - dragOffset;

  return (
    <section
      id="tutors"
      aria-label="Danh sách gia sư tiêu biểu"
      className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200 scroll-mt-24"
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </span>
            <h2 className="text-lg font-bold text-gray-900">Gia sư tiêu biểu</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Đội ngũ gia sư xuất sắc, giàu kinh nghiệm được học sinh và phụ huynh đánh giá cao
          </p>
        </div>

        {/* Nút điều hướng trái / phải */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={N <= 1}
            aria-label="Xem gia sư trước"
            title="Xem gia sư trước"
            className={`p-1.5 rounded-lg border border-gray-200 transition-colors ${
              N <= 1
                ? "text-gray-300 border-gray-100 cursor-not-allowed"
                : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={N <= 1}
            aria-label="Xem gia sư tiếp theo"
            title="Xem gia sư tiếp theo"
            className={`p-1.5 rounded-lg border border-gray-200 transition-colors ${
              N <= 1
                ? "text-gray-300 border-gray-100 cursor-not-allowed"
                : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {N === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Không tìm thấy gia sư phù hợp với tiêu chí lọc.
          </p>
          <p className="text-xs text-gray-500">
            Vui lòng thử chọn tiêu chí khác hoặc bấm đặt lại để xem toàn bộ danh sách.
          </p>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Xóa bộ lọc / Xem tất cả</span>
            </button>
          )}
        </div>
      ) : (
        /* Infinite carousel với thời gian giữ 1000ms (giữ mỗi card 1 giây trước khi chuyển) */
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          onPointerOver={handleInteractivePointerOver}
          onPointerOut={handleInteractivePointerOut}
          className={`relative overflow-hidden w-full py-1 ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
        >
          <div
            ref={trackRef}
            onTransitionEnd={handleTransitionEnd}
            style={{
              transform: `translate3d(-${currentOffset}px, 0, 0)`,
              transition: isTransitioning ? "transform 500ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
              gap: `${gap}px`,
            }}
            className="flex items-stretch will-change-transform"
          >
            {displayItems.map((item) => (
              <div
                key={item.key}
                style={{
                  width: `${cardWidth}px`,
                  flexShrink: 0,
                }}
                className="h-full flex flex-col"
              >
                <TutorCard tutor={item.tutor} isClone={item.isClone} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
