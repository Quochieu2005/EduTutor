"use client";

import { useState } from "react";
import {
  RIGHT_DOCUMENTS,
  RIGHT_NEWS,
  ACCESS_STATISTICS,
  type NewsItem,
} from "@/lib/home-mock-data";

export function RightSidebar() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  return (
    <aside className="w-full space-y-6" aria-label="Tài liệu và thông tin bổ sung">
      {/* 1. Nhóm: TÀI LIỆU THAM KHẢO */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-bold text-sm tracking-wide flex items-center justify-between">
          <span className="uppercase">TÀI LIỆU THAM KHẢO</span>
          <svg className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <ul className="divide-y divide-gray-100 text-sm">
          {RIGHT_DOCUMENTS.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => setSelectedDoc(item.label)}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between group text-gray-700 hover:bg-blue-50/70 hover:text-blue-600 transition-colors focus:outline-hidden focus-visible:bg-blue-50"
              >
                <span className="flex items-center gap-2">
                  <span className="text-red-500 font-bold group-hover:translate-x-0.5 transition-transform">
                    ▸
                  </span>
                  <span>{item.label}</span>
                </span>
                <span className="text-[11px] text-gray-400 group-hover:text-blue-500 font-medium">
                  {item.downloads}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Nhóm: TIN TỨC */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-white font-bold text-sm tracking-wide flex items-center justify-between">
          <span className="uppercase">TIN TỨC</span>
          <svg className="w-4 h-4 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <div className="divide-y divide-gray-100 p-2">
          {RIGHT_NEWS.map((news, index) => (
            <button
              key={news.id}
              type="button"
              onClick={() => setSelectedNews(news)}
              className="w-full p-2 text-left flex items-start gap-3 rounded-lg hover:bg-purple-50/60 group transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              {/* Thumbnail nội bộ bằng vector/gradient đại diện chủ đề */}
              <div
                className={`w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-white shadow-xs ${
                  index === 0
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                    : index === 1
                    ? "bg-gradient-to-br from-purple-500 to-pink-600"
                    : "bg-gradient-to-br from-indigo-500 to-cyan-600"
                }`}
                aria-hidden="true"
              >
                {index === 0 ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ) : index === 1 ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">
                  {news.badge}
                </span>
                <h4 className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 line-clamp-2 transition-colors">
                  {news.title}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">{news.date}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Nhóm: THỐNG KÊ TRUY CẬP */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-3 text-white font-bold text-sm tracking-wide">
          <span className="uppercase">THỐNG KÊ TRUY CẬP</span>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Đang trực tuyến:
            </span>
            <span className="font-bold text-emerald-600">
              {ACCESS_STATISTICS.online}
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Lượt truy cập hôm nay:
            </span>
            <span className="font-semibold text-gray-900">
              {ACCESS_STATISTICS.today.toLocaleString("vi-VN")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Tổng lượt truy cập:
            </span>
            <span className="font-bold text-blue-700">
              {ACCESS_STATISTICS.total.toLocaleString("vi-VN")}
            </span>
          </div>
        </div>
      </div>

      {/* Modal xem trước tài liệu khi bấm (tránh route chết) */}
      {selectedDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-600">📄</span>
                {selectedDoc}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tài liệu tóm tắt kiến thức trọng tâm, công thức và bộ đề thi trắc nghiệm có đáp án chi tiết dành cho học sinh và gia sư tham khảo.
            </p>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 flex items-center justify-between">
              <span>Định dạng: <strong>PDF (12.4 MB)</strong></span>
              <span>Cập nhật: <strong>2026</strong></span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Đã chuẩn bị tải về tài liệu: ${selectedDoc}`);
                  setSelectedDoc(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Tải xuống
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem tin tức khi bấm */}
      {selectedNews && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {selectedNews.badge}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-snug">
              {selectedNews.title}
            </h3>
            <p className="text-xs text-gray-400">Ngày đăng: {selectedNews.date}</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {selectedNews.summary}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
