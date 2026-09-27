"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk, UserButton } from "@/lib/auth-context";
import {
  SearchOutlined,
  LoginOutlined,
  MenuOutlined,
  CloseOutlined,
  UserOutlined,
  EllipsisOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
} from "@ant-design/icons";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const isHome = pathname === "/" || pathname === "/Home";
  const isClasses = pathname === "/classes" || pathname.startsWith("/classes/");
  const isTutors = pathname === "/tutors" || pathname.startsWith("/tutors/");

  const navLinks = [
    { label: "Trang chủ", href: isHome ? "#hero" : "/", isActive: isHome, isAnchor: isHome },
    { label: "Đội ngũ gia sư", href: "/tutors", isActive: isTutors, isAnchor: false },
    { label: "Nhận lớp", href: "/classes", isActive: isClasses, isAnchor: false },
    { label: "Quy trình", href: isHome ? "#timeline" : "/#timeline", isActive: false, isAnchor: isHome },
    { label: "Bài viết", href: isHome ? "#articles" : "/#articles", isActive: false, isAnchor: isHome },
    { label: "Liên hệ", href: isHome ? "#contact" : "/#contact", isActive: false, isAnchor: isHome },
  ];

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && moreMenuOpen) {
        setMoreMenuOpen(false);
        moreButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreMenuOpen]);

  const handleScrollOrNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#") && isHome) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      setMobileMenuOpen(false);
    } else {
      setMobileMenuOpen(false);
    }
  };

  const moreMenuItems = [
    {
      label: "Giới thiệu",
      href: isHome ? "#why-choose" : "/#why-choose",
      icon: <InfoCircleOutlined className="text-blue-600" />,
      action: (e: React.MouseEvent<HTMLAnchorElement>) => {
        handleScrollOrNav(e, isHome ? "#why-choose" : "/#why-choose");
        setMoreMenuOpen(false);
      },
    },
    {
      label: "Liên hệ",
      href: isHome ? "#contact" : "/#contact",
      icon: <PhoneOutlined className="text-blue-600" />,
      action: (e: React.MouseEvent<HTMLAnchorElement>) => {
        handleScrollOrNav(e, isHome ? "#contact" : "/#contact");
        setMoreMenuOpen(false);
      },
    },
    {
      label: "Blog",
      href: isHome ? "#articles" : "/#articles",
      icon: <FileTextOutlined className="text-blue-600" />,
      action: (e: React.MouseEvent<HTMLAnchorElement>) => {
        handleScrollOrNav(e, isHome ? "#articles" : "/#articles");
        setMoreMenuOpen(false);
      },
    },
    {
      label: "Tuyển dụng",
      href: "/tutors/register",
      icon: <TeamOutlined className="text-blue-600" />,
      action: () => setMoreMenuOpen(false),
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo EduTutor */}
          <Link
            href="/"
            className="flex items-center group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl py-1 px-1 transition-colors"
          >
            <span className="text-2xl font-black tracking-tight text-blue-900 select-none">
              Edu<span className="text-blue-600">Tutor</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((item) =>
              item.isAnchor ? (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleScrollOrNav(e, item.href)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    item.isActive
                      ? "text-blue-600 bg-blue-50 font-bold"
                      : "text-slate-700 hover:text-blue-600 hover:bg-blue-50/70"
                  }`}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    item.isActive
                      ? "text-blue-600 bg-blue-50 font-bold"
                      : "text-slate-700 hover:text-blue-600 hover:bg-blue-50/70"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}

            {/* Menu Ba Chấm (Ảnh 6 - EllipsisOutlined) */}
            <div className="relative">
              <button
                ref={moreButtonRef}
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
                aria-label="Tùy chọn mở rộng"
                className={`p-2 rounded-xl border text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  moreMenuOpen ? "bg-blue-50 border-blue-300 text-blue-600" : "border-transparent"
                }`}
              >
                <EllipsisOutlined className="text-xl rotate-90" />
              </button>

              {/* Dropdown Menu */}
              {moreMenuOpen && (
                <div
                  ref={moreMenuRef}
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-blue-100 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {moreMenuItems.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.href}
                      role="menuitem"
                      onClick={item.action}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors focus:outline-hidden focus:bg-blue-50 focus:text-blue-600"
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  ))}

                  <div className="my-1 border-t border-slate-100" />

                  {/* Gia sư đăng nhập */}
                  {isSignedIn ? (
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setMoreMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <UserOutlined className="text-blue-600 text-sm" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        openSignIn();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer text-left"
                    >
                      <LoginOutlined className="text-blue-600 text-sm" />
                      <span>Gia sư đăng nhập</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Header Actions (CTA + Auth) */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href={isHome ? "#register" : "/#register"}
              onClick={(e) => handleScrollOrNav(e, isHome ? "#register" : "/#register")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <SearchOutlined />
              <span>Tìm gia sư</span>
            </a>

            {isSignedIn ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <UserOutlined className="text-sm text-blue-600" />
                  <span className="max-w-[100px] truncate">{user?.fullName || "Tài khoản"}</span>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openSignIn()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 text-sm font-semibold transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <LoginOutlined />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-blue-600 text-lg transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((item) =>
                item.isAnchor ? (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleScrollOrNav(e, item.href)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      item.isActive
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      item.isActive
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              )}

              <div className="my-2 border-t border-slate-100 pt-2">
                <p className="px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Mở rộng
                </p>
                {moreMenuItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    onClick={(e) => {
                      item.action(e);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </nav>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <a
                href={isHome ? "#register" : "/#register"}
                onClick={(e) => handleScrollOrNav(e, isHome ? "#register" : "/#register")}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-600/20"
              >
                <SearchOutlined />
                <span>Tìm gia sư</span>
              </a>

              {isSignedIn ? (
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50"
                >
                  <UserOutlined />
                  <span>Trang cá nhân ({user?.fullName || "Tài khoản"})</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openSignIn();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  <LoginOutlined />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
