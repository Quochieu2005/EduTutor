"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { Button } from "./ui/Button";

export function Navbar() {
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            EduTutor
          </Link>

          <div className="hidden md:flex items-center gap-5">
            <Link
              href="/tutors"
              className="text-gray-600 hover:text-blue-600 transition font-medium text-sm"
            >
              Tìm gia sư
            </Link>
            <Link
              href="/#trial_section"
              className="text-gray-600 hover:text-blue-600 transition font-medium text-sm flex items-center gap-1"
            >
              <span>Học thử</span>
              <span className="px-1.5 py-0.2 text-3xs font-bold rounded-md bg-pink-100 text-pink-600">
                0đ
              </span>
            </Link>
            <Link
              href="/become-tutor"
              className="text-gray-600 hover:text-purple-600 transition font-medium text-sm"
            >
              Đăng ký làm gia sư
            </Link>
            {user && (
              <Link
                href="/lessons"
                className="text-gray-600 hover:text-blue-600 transition font-medium text-sm"
              >
                Lịch học
              </Link>
            )}
            {(user?.publicMetadata as { role?: string })?.role === "tutor" && (
              <Link
                href="/profile"
                className="text-gray-600 hover:text-blue-600 transition font-medium text-sm"
              >
                Hồ sơ gia sư
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600">
                  Xin chào, <strong>{user.firstName}</strong>
                </span>
                <SignOutButton>
                  <Button variant="ghost" size="sm">
                    Đăng xuất
                  </Button>
                </SignOutButton>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Đăng ký</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t pt-4">
            <Link
              href="/tutors"
              className="block py-2 text-gray-600 font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Tìm gia sư
            </Link>
            <Link
              href="/#trial_section"
              className="block py-2 text-blue-600 font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Học thử miễn phí (0đ)
            </Link>
            <Link
              href="/become-tutor"
              className="block py-2 text-purple-600 font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Đăng ký làm gia sư
            </Link>
            {user && (
              <Link
                href="/lessons"
                className="block py-2 text-gray-600"
                onClick={() => setMobileOpen(false)}
              >
                Lịch học
              </Link>
            )}
            {(user?.publicMetadata as { role?: string })?.role === "tutor" && (
              <Link
                href="/profile"
                className="block py-2 text-gray-600"
                onClick={() => setMobileOpen(false)}
              >
                Hồ sơ gia sư
              </Link>
            )}
            {user ? (
              <SignOutButton>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => setMobileOpen(false)}
                >
                  Đăng xuất
                </Button>
              </SignOutButton>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link
                  href="/login"
                  className="flex-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button variant="outline" size="sm" fullWidth>
                    Đăng nhập
                  </Button>
                </Link>
                <Link
                  href="/register"
                  className="flex-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button size="sm" fullWidth>
                    Đăng ký
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
