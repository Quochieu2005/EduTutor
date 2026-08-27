import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <Link
              href="/"
              className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent inline-block mb-3"
            >
              EduTutor
            </Link>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-4">
              Nền tảng kết nối gia sư dạy kèm 1-1 hàng đầu Việt Nam. Đáp ứng mọi
              nhu cầu học tập với dịch vụ gia sư uy tín, chuyên nghiệp.
            </p>
            <p className="text-gray-400 text-xs">
              📍 107A Nguyễn Phong Sắc, Cầu Giấy, Hà Nội
              <br />
              📞 Hotline: 0369 148 660
              <br />
              ✉️ Email: support@edututor.vn
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 text-white uppercase tracking-wider">
              Môn học phổ biến
            </h4>
            <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
              <li>
                <Link
                  href="/tutors?subject=Toán"
                  className="hover:text-white transition"
                >
                  Gia sư Toán
                </Link>
              </li>
              <li>
                <Link
                  href="/tutors?subject=Tiếng Anh"
                  className="hover:text-white transition"
                >
                  Gia sư Tiếng Anh
                </Link>
              </li>
              <li>
                <Link
                  href="/tutors?subject=Tiếng Anh"
                  className="hover:text-white transition"
                >
                  Luyện thi IELTS / TOEIC
                </Link>
              </li>
              <li>
                <Link
                  href="/tutors?subject=Văn học"
                  className="hover:text-white transition"
                >
                  Gia sư Ngữ Văn
                </Link>
              </li>
              <li>
                <Link
                  href="/tutors?subject=Vật lý"
                  className="hover:text-white transition"
                >
                  Gia sư Lý - Hóa - Sinh
                </Link>
              </li>
              <li>
                <Link
                  href="/tutors?subject=Lập trình"
                  className="hover:text-white transition"
                >
                  Gia sư Lập trình & Tin học
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 text-white uppercase tracking-wider">
              Dịch vụ & Tiện ích
            </h4>
            <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
              <li>
                <Link href="/tutors" className="hover:text-white transition">
                  Tìm gia sư theo môn
                </Link>
              </li>
              <li>
                <Link
                  href="/#trial_section"
                  className="hover:text-white transition"
                >
                  Đăng ký học thử 01 buổi
                </Link>
              </li>
              <li>
                <Link href="/lessons" className="hover:text-white transition">
                  Quản lý lịch học
                </Link>
              </li>
              <li>
                <Link
                  href="/become-tutor"
                  className="hover:text-white transition"
                >
                  Đăng ký làm gia sư
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-white transition">
                  Hồ sơ cá nhân
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 text-white uppercase tracking-wider">
              Hỗ trợ & Pháp lý
            </h4>
            <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
              <li>
                <Link
                  href="/#trial_section"
                  className="hover:text-white transition"
                >
                  Tư vấn trực tiếp 24/7
                </Link>
              </li>
              <li>
                <a
                  href="https://zalo.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  Hỗ trợ qua Zalo
                </a>
              </li>
              <li>
                <Link href="/tutors" className="hover:text-white transition">
                  Chính sách học thử & Đổi gia sư
                </Link>
              </li>
              <li>
                <Link href="/tutors" className="hover:text-white transition">
                  Quy định & Điều khoản
                </Link>
              </li>
              <li>
                <Link href="/tutors" className="hover:text-white transition">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-xs">
          <p>&copy; 2026 EduTutor. Nền tảng học tập trực tuyến 1-1 hàng đầu.</p>
          <div className="flex gap-4">
            <Link href="/tutors" className="hover:text-white transition">
              Điều khoản
            </Link>
            <span>•</span>
            <Link href="/tutors" className="hover:text-white transition">
              Bảo mật
            </Link>
            <span>•</span>
            <Link
              href="/#trial_section"
              className="hover:text-white transition"
            >
              Liên hệ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
