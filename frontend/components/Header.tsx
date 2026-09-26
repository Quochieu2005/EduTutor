"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Trạng thái dropdown trên desktop
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [tutorDropdownOpen, setTutorDropdownOpen] = useState(false);

  // Trạng thái accordion trên mobile
  const [mobileClassOpen, setMobileClassOpen] = useState(false);
  const [mobileTutorOpen, setMobileTutorOpen] = useState(false);

  const classRef = useRef<HTMLDivElement>(null);
  const tutorRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classRef.current && !classRef.current.contains(event.target as Node)) {
        setClassDropdownOpen(false);
      }
      if (tutorRef.current && !tutorRef.current.contains(event.target as Node)) {
        setTutorDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setClassDropdownOpen(false);
        setTutorDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Đường dẫn liên hệ: Nếu đang ở /Home thì dùng #contact, nếu ở trang khác thì dùng /Home#contact
  const contactHref = pathname === "/Home" ? "#contact" : "/Home#contact";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 4.1. Góc trái: Logo EduTutor - đồng thời là nút Home dẫn về /Home */}
          <Link
            href="/Home"
            aria-label="EduTutor Trang chủ"
            className="flex items-center gap-2.5 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 transition-transform active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.42 10.922a1 1 0 0 0-.019-.838L12.83 2.18a2 2 0 0 0-1.66 0L2.6 10.084a1 1 0 0 0 0 1.832l8.57 7.904a2 2 0 0 0 1.66 0l8.57-7.904a1 1 0 0 0 .02-.994z" />
                <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors">
                Edu<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Tutor</span>
              </span>
              <span className="text-[10px] text-gray-500 font-medium -mt-1 tracking-wider uppercase">
                Kết nối tri thức
              </span>
            </div>
          </Link>

          {/* 4.2. Chính giữa: Menu điều hướng (Lớp có dropdown, Gia sư có dropdown, Liên hệ) */}
          <nav
            aria-label="Menu chính"
            className="hidden md:flex items-center gap-1 lg:gap-2"
          >
            {/* 2. Menu Lớp với Dropdown */}
            <div
              ref={classRef}
              className="relative"
              onMouseEnter={() => setClassDropdownOpen(true)}
              onMouseLeave={() => setClassDropdownOpen(false)}
            >
              <div className="flex items-center rounded-lg hover:bg-blue-50/70 transition-colors group">
                <Link
                  href="/classes"
                  className="px-3 py-2 text-sm font-semibold text-gray-700 group-hover:text-blue-600 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-l-lg"
                >
                  Lớp
                </Link>
                <button
                  type="button"
                  aria-label="Mở danh mục lớp học"
                  aria-haspopup="true"
                  aria-expanded={classDropdownOpen}
                  onClick={() => setClassDropdownOpen((prev) => !prev)}
                  className="pr-2 py-2 text-gray-400 group-hover:text-blue-600 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-lg"
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      classDropdownOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Dropdown Menu Lớp Desktop */}
              {classDropdownOpen && (
                <div
                  role="menu"
                  aria-label="Danh mục lớp học"
                  className="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                >
                  <Link
                    href="/classes?category=primary"
                    role="menuitem"
                    onClick={() => setClassDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-500 mr-2">▸</span>
                    <span>Lớp cấp 1</span>
                  </Link>
                  <Link
                    href="/classes?category=secondary"
                    role="menuitem"
                    onClick={() => setClassDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-500 mr-2">▸</span>
                    <span>Lớp cấp 2</span>
                  </Link>
                  <Link
                    href="/classes?category=high-school"
                    role="menuitem"
                    onClick={() => setClassDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-500 mr-2">▸</span>
                    <span>Lớp cấp 3</span>
                  </Link>
                  <Link
                    href="/classes?category=foreign-language"
                    role="menuitem"
                    onClick={() => setClassDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-500 mr-2">▸</span>
                    <span>Lớp ngoại ngữ</span>
                  </Link>
                  <Link
                    href="/classes?category=talent"
                    role="menuitem"
                    onClick={() => setClassDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-500 mr-2">▸</span>
                    <span>Lớp năng khiếu</span>
                  </Link>
                  <Link
                    href="/classes?category=exam-prep"
                    role="menuitem"
                    onClick={() => setClassDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-500 mr-2">▸</span>
                    <span>Lớp luyện thi</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 3. Menu Gia sư với Dropdown */}
            <div
              ref={tutorRef}
              className="relative"
              onMouseEnter={() => setTutorDropdownOpen(true)}
              onMouseLeave={() => setTutorDropdownOpen(false)}
            >
              <div className="flex items-center rounded-lg hover:bg-purple-50/70 transition-colors group">
                <Link
                  href="/tutors"
                  className="px-3 py-2 text-sm font-semibold text-gray-700 group-hover:text-purple-600 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 rounded-l-lg"
                >
                  Gia sư
                </Link>
                <button
                  type="button"
                  aria-label="Mở danh mục gia sư"
                  aria-haspopup="true"
                  aria-expanded={tutorDropdownOpen}
                  onClick={() => setTutorDropdownOpen((prev) => !prev)}
                  className="pr-2 py-2 text-gray-400 group-hover:text-purple-600 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 rounded-r-lg"
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      tutorDropdownOpen ? "rotate-180 text-purple-600" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Dropdown Menu Gia sư Desktop */}
              {tutorDropdownOpen && (
                <div
                  role="menu"
                  aria-label="Danh mục gia sư"
                  className="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                >
                  <Link
                    href="/tutors"
                    role="menuitem"
                    onClick={() => setTutorDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    <span className="text-purple-500 mr-2">▸</span>
                    <span>Gia sư hiện có</span>
                  </Link>
                  <Link
                    href="/tutors/register"
                    role="menuitem"
                    onClick={() => setTutorDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    <span className="text-purple-500 mr-2">▸</span>
                    <span>Đăng ký gia sư</span>
                  </Link>
                  <Link
                    href="/tutors/class-rules"
                    role="menuitem"
                    onClick={() => setTutorDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    <span className="text-purple-500 mr-2">▸</span>
                    <span>Nội quy nhận lớp</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 4. Menu Liên hệ */}
            <a
              href={contactHref}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Liên hệ
            </a>
          </nav>

          {/* 4.3. Bên phải: Đăng ký & Đăng nhập bằng Icon (Chưa đăng nhập) hoặc UserButton (Đã đăng nhập) */}
          <div className="flex items-center gap-2">
            <SignedOut>
              <div className="flex items-center gap-1.5">
                {/* 1. Icon Đăng ký tài khoản (mở SignUp của Clerk) */}
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    aria-label="Đăng ký tài khoản"
                    title="Đăng ký tài khoản"
                    className="p-2.5 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 border border-gray-200 hover:border-purple-300"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </button>
                </SignUpButton>

                {/* 2. Icon Đăng nhập (mở SignIn của Clerk) */}
                <SignInButton mode="modal">
                  <button
                    type="button"
                    aria-label="Đăng nhập"
                    title="Đăng nhập"
                    className="p-2.5 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 border border-gray-200 hover:border-blue-300"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  </button>
                </SignInButton>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center pl-1">
                <UserButton
                  userProfileMode="navigation"
                  userProfileUrl="/profile"
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 ring-2 ring-blue-500/30",
                    },
                  }}
                />
              </div>
            </SignedIn>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown & Accordion */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          {/* Accordion Lớp */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50/70">
              <Link
                href="/classes"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-gray-900 hover:text-blue-600"
              >
                Lớp học
              </Link>
              <button
                type="button"
                onClick={() => setMobileClassOpen(!mobileClassOpen)}
                className="p-1 text-gray-500 hover:text-blue-600"
                aria-label="Mở rộng danh mục lớp"
                aria-expanded={mobileClassOpen}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    mobileClassOpen ? "rotate-180 text-blue-600" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {mobileClassOpen && (
              <div className="bg-white py-1 px-3 space-y-1 divide-y divide-gray-50">
                <Link
                  href="/classes?category=primary"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-blue-600"
                >
                  Lớp cấp 1
                </Link>
                <Link
                  href="/classes?category=secondary"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-blue-600"
                >
                  Lớp cấp 2
                </Link>
                <Link
                  href="/classes?category=high-school"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-blue-600"
                >
                  Lớp cấp 3
                </Link>
                <Link
                  href="/classes?category=foreign-language"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-blue-600"
                >
                  Lớp ngoại ngữ
                </Link>
                <Link
                  href="/classes?category=talent"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-blue-600"
                >
                  Lớp năng khiếu
                </Link>
                <Link
                  href="/classes?category=exam-prep"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-blue-600"
                >
                  Lớp luyện thi
                </Link>
              </div>
            )}
          </div>

          {/* Accordion Gia sư */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50/70">
              <Link
                href="/tutors"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-gray-900 hover:text-purple-600"
              >
                Gia sư
              </Link>
              <button
                type="button"
                onClick={() => setMobileTutorOpen(!mobileTutorOpen)}
                className="p-1 text-gray-500 hover:text-purple-600"
                aria-label="Mở rộng danh mục gia sư"
                aria-expanded={mobileTutorOpen}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    mobileTutorOpen ? "rotate-180 text-purple-600" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {mobileTutorOpen && (
              <div className="bg-white py-1 px-3 space-y-1 divide-y divide-gray-50">
                <Link
                  href="/tutors"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-purple-600"
                >
                  Gia sư hiện có
                </Link>
                <Link
                  href="/tutors/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-purple-600"
                >
                  Đăng ký gia sư
                </Link>
                <Link
                  href="/tutors/class-rules"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-medium text-gray-700 hover:text-purple-600"
                >
                  Nội quy nhận lớp
                </Link>
              </div>
            )}
          </div>

          {/* Liên hệ */}
          <a
            href={contactHref}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Liên hệ
          </a>
        </div>
      )}
    </header>
  );
}
