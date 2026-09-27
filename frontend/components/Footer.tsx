import Link from "next/link";

export function Footer() {
  return (
    <footer id="contact" className="bg-gray-950 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-gray-800">
          {/* Logo EduTutor dẫn về /Home */}
          <div className="space-y-3">
            <Link
              href="/Home"
              aria-label="EduTutor Trang chủ"
              className="inline-flex items-center gap-2.5 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
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
                  <path d="M21.42 10.922a1 1 0 0 0-.019-.838L12.83 2.18a2 2 0 0 0-1.66 0L2.6 10.084a1 1 0 0 0 0 1.832l8.57 7.904a2 2 0 0 0 1.66 0l8.57-7.904a1 1 0 0 0 .02-.994z" />
                  <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                Edu<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Tutor</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Nền tảng kết nối học sinh, phụ huynh với gia sư dạy kèm uy tín, chất lượng tại các tỉnh thành trên cả nước.
            </p>
          </div>

          {/* Khu vực liên hệ (để menu Liên hệ cuộn tới) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Thông tin liên hệ
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>contact@edututor.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Hotline: 1900 6868</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Hỗ trợ trực tuyến toàn quốc</span>
              </li>
            </ul>
          </div>

          {/* Liên kết điều hướng nhanh (dùng /Home#classes, /Home#tutors, /Home) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Điều hướng nhanh
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/Home#classes" className="hover:text-blue-400 transition-colors">
                  Danh sách lớp học
                </Link>
              </li>
              <li>
                <Link href="/Home#tutors" className="hover:text-purple-400 transition-colors">
                  Gia sư tiêu biểu
                </Link>
              </li>
              <li>
                <Link href="/Home" className="hover:text-white transition-colors">
                  Trang chủ EduTutor
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Dòng chính xác theo yêu cầu: Đồ Án web 2023 */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p className="font-medium text-gray-400">
            Đồ Án web 2023
          </p>
          <p>
            © 2023 - 2026 EduTutor. Nền tảng kết nối giáo dục.
          </p>
        </div>
      </div>
    </footer>
  );
}
