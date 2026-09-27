"use client";

import Link from "next/link";
import {
  EnvironmentFilled,
  PhoneFilled,
  MailFilled,
  GlobalOutlined,
  FacebookFilled,
  YoutubeFilled,
  VideoCameraFilled,
} from "@ant-design/icons";

export function Footer() {
  return (
    <footer id="contact" className="relative bg-slate-900 text-slate-300 pt-16 pb-8 overflow-hidden">
      {/* Top Wave/Curved Line created purely via CSS (no manual SVG) */}
      <div
        className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Brand (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-4">
            <Link
              href="/"
              className="inline-block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
            >
              <span className="text-2xl font-black tracking-tight text-white select-none">
                Edu<span className="text-blue-400">Tutor</span>
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ sinh thái kết nối gia sư uy tín hàng đầu, đồng hành cùng hàng ngàn học sinh tự tin chinh phục tri thức và phát triển tương lai.
            </p>
          </div>

          {/* Col 2: Contact Information (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-blue-500 pl-2.5">
              Thông Tin Liên Hệ
            </h4>

            <p className="text-xs text-slate-400 leading-relaxed">
              Để biết thêm thông tin chi tiết về các dịch vụ gia sư và được tư vấn lộ trình học phù hợp nhất cho con em mình, quý phụ huynh vui lòng liên hệ với Trung tâm EduTutor qua:
            </p>

            <p className="text-xs font-bold text-blue-300">TRUNG TÂM GIA SƯ EDUTUTOR</p>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <EnvironmentFilled className="text-blue-400 text-sm mt-0.5 shrink-0" />
                <span>Địa chỉ: 101 Bưng Ông Thoàn, Phường Long Trường, TP.HCM</span>
              </li>
              <li className="flex items-center gap-2.5">
                <PhoneFilled className="text-blue-400 text-sm shrink-0" />
                <span>Hotline/Zalo: 0931 44 9696</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MailFilled className="text-blue-400 text-sm shrink-0" />
                <span>Email: hotro@edututor.vn</span>
              </li>
              <li className="flex items-center gap-2.5">
                <GlobalOutlined className="text-blue-400 text-sm shrink-0" />
                <span>Website: edututor.vn</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Useful Information (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-blue-500 pl-2.5">
              Thông Tin Cần Biết
            </h4>

            <ul className="space-y-2 text-xs">
              <li>
                <a href="#hero" className="text-slate-400 hover:text-white transition-colors">
                  Về chúng tôi
                </a>
              </li>
              <li>
                <a href="#tutors" className="text-slate-400 hover:text-white transition-colors">
                  Đội ngũ gia sư
                </a>
              </li>
              <li>
                <a href="#timeline" className="text-slate-400 hover:text-white transition-colors">
                  Quy trình nhận lớp
                </a>
              </li>
              <li>
                <a href="#register" className="text-slate-400 hover:text-white transition-colors">
                  Đăng ký học thử
                </a>
              </li>
              <li>
                <a href="#articles" className="text-slate-400 hover:text-white transition-colors">
                  Bài viết chia sẻ
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Social Networks & Maps (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-blue-500 pl-2.5">
              Kết Nối & Mạng Xã Hội
            </h4>

            <p className="text-xs text-slate-400">
              Theo dõi EduTutor trên các nền tảng truyền thông để nhận tài liệu học tập và tin tức giáo dục mới nhất.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-semibold transition-all group"
              >
                <FacebookFilled className="text-sm text-blue-400 group-hover:text-white" />
                <span>Facebook</span>
              </a>

              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all group"
              >
                <VideoCameraFilled className="text-sm text-rose-400 group-hover:text-white" />
                <span>TikTok</span>
              </a>

              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold transition-all group"
              >
                <YoutubeFilled className="text-sm text-rose-500 group-hover:text-white" />
                <span>YouTube</span>
              </a>

              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-semibold transition-all group"
              >
                <EnvironmentFilled className="text-sm text-emerald-400 group-hover:text-white" />
                <span>Bản đồ</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Exact Required Sentences */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p className="font-semibold text-blue-400">
            Đây là đồ án web 2026
          </p>
          <p>
            © 2026 EduTutor. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
