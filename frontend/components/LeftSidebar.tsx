"use client";

import Link from "next/link";
import {
  LEFT_PROVINCES,
  LEFT_FIND_CATEGORIES,
} from "@/lib/home-mock-data";

interface LeftSidebarProps {
  activeKey?: string | null;
}

export function LeftSidebar({ activeKey }: LeftSidebarProps) {
  return (
    <aside className="w-full space-y-6" aria-label="Bộ lọc khu vực và danh mục">
      {/* Nhóm: GIA SƯ CÁC TỈNH THÀNH */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-bold text-sm tracking-wide flex items-center justify-between">
          <span className="uppercase">GIA SƯ CÁC TỈNH THÀNH</span>
          <svg className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <ul className="divide-y divide-gray-100 text-sm">
          {LEFT_PROVINCES.map((item) => {
            const isActive = activeKey === item.key;
            return (
              <li key={item.key}>
                <Link
                  href={`/tutors/results/${item.key}`}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between group transition-colors focus:outline-hidden focus-visible:bg-blue-50 cursor-pointer ${
                    isActive
                      ? "bg-blue-50/80 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-red-500 font-bold group-hover:translate-x-0.5 transition-transform">
                      ▸
                    </span>
                    <span>{item.label}</span>
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Nhóm: TÌM GIA SƯ */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-white font-bold text-sm tracking-wide flex items-center justify-between">
          <span className="uppercase">TÌM GIA SƯ</span>
          <svg className="w-4 h-4 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <ul className="divide-y divide-gray-100 text-sm">
          {LEFT_FIND_CATEGORIES.map((item) => {
            const isActive = activeKey === item.key;

            return (
              <li key={item.key}>
                <Link
                  href={`/tutors/results/${item.key}`}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between group transition-colors focus:outline-hidden focus-visible:bg-purple-50 cursor-pointer ${
                    isActive
                      ? "bg-purple-50/80 text-purple-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50 hover:text-purple-600"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-red-500 font-bold group-hover:translate-x-0.5 transition-transform">
                      ▸
                    </span>
                    <span>{item.label}</span>
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
