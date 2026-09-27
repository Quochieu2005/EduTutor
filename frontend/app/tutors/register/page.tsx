"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CITIES, SUBJECTS } from "@/lib/home-mock-data";
import {
  getTutorApplicationForUser,
  saveTutorApplication,
  type TutorApplication,
} from "@/lib/portal-store";

export default function TutorRegisterPage() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const [formData, setFormData] = useState({
    fullName: "",
    subject: "Toán",
    grades: "",
    city: "Hà Nội",
    teachingMode: "both",
    experience: "3",
    desiredFee: "200.000đ/buổi",
    bio: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingApplication, setExistingApplication] = useState<TutorApplication | null>(null);

  useEffect(() => {
    if (!user) return;
    const initialLoad = window.setTimeout(() => {
      const existing = getTutorApplicationForUser(user.id) ?? null;
      setExistingApplication(existing);
      setFormData((current) => ({
        ...current,
        fullName: current.fullName || user.fullName || "",
      }));
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Yêu cầu đăng nhập Clerk trước khi gửi form
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    if (!user) return;

    const application = saveTutorApplication({
      userId: user.id,
      userEmail: user.primaryEmailAddress?.emailAddress || "",
      fullName: formData.fullName || user.fullName || "Ứng viên",
      subject: formData.subject,
      grades: formData.grades,
      city: formData.city,
      teachingMode: formData.teachingMode as "online" | "offline" | "both",
      experience: Number(formData.experience),
      desiredFee: formData.desiredFee,
      bio: formData.bio,
    });
    setExistingApplication(application);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/Home" className="hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/tutors" className="hover:text-blue-600 transition-colors">
                Gia sư
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-gray-900">Đăng ký làm gia sư</li>
          </ol>
        </nav>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Đăng ký trở thành gia sư EduTutor
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Tham gia cộng đồng giáo viên và sinh viên dạy kèm uy tín trên cả nước
            </p>
          </div>

          {existingApplication && !isSubmitted && (
            <div className={`p-4 rounded-xl border text-xs ${
              existingApplication.status === "approved"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : existingApplication.status === "rejected"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              Hồ sơ hiện tại: <strong>{existingApplication.status === "approved" ? "Đã duyệt" : existingApplication.status === "rejected" ? "Từ chối" : "Đang chờ Admin duyệt"}</strong>.
              {existingApplication.status === "approved" && " Bạn đã có thể đăng ký nhận lớp."}
            </div>
          )}

          {/* Trạng thái xác nhận giả lập sau khi gửi thành công */}
          {isSubmitted ? (
            <div className="py-10 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-gray-900">Đăng ký thành công!</h2>
              <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                Hồ sơ gia sư của bạn (<strong>{formData.fullName || user?.fullName || "Ứng viên"}</strong>) đã được ghi nhận trên hệ thống thử nghiệm EduTutor. Ban quản lý sẽ liên hệ kiểm duyệt chứng chỉ và kết nối lớp học phù hợp.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Gửi thêm hồ sơ khác
                </button>
                <Link
                  href="/tutors"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  Xem danh sách gia sư
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cảnh báo đăng nhập nếu chưa đăng nhập */}
              {!isSignedIn && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <strong className="block font-bold">Yêu cầu đăng nhập tài khoản:</strong>
                    <span>Bạn cần đăng nhập với Clerk trước khi gửi hồ sơ đăng ký gia sư.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSignIn()}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shrink-0 self-start sm:self-auto shadow-xs"
                  >
                    Đăng nhập Clerk ngay
                  </button>
                </div>
              )}

              {/* 1. Họ tên */}
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-700 mb-1">
                  Họ và tên đầy đủ *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn Hoàng"
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* 2. Môn giảng dạy + Cấp/lớp nhận dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-subject" className="block text-xs font-semibold text-gray-700 mb-1">
                    Môn giảng dạy chính *
                  </label>
                  <select
                    id="reg-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-hidden focus:border-blue-500"
                  >
                    {SUBJECTS.filter((s) => s !== "Tất cả môn").map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-grades" className="block text-xs font-semibold text-gray-700 mb-1">
                    Cấp / Lớp nhận dạy *
                  </label>
                  <input
                    id="reg-grades"
                    type="text"
                    required
                    value={formData.grades}
                    onChange={(e) => setFormData({ ...formData, grades: e.target.value })}
                    placeholder="Ví dụ: Lớp 9, Lớp 10, Ôn thi vào 10"
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* 3. Khu vực + Hình thức dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-city" className="block text-xs font-semibold text-gray-700 mb-1">
                    Khu vực / Tỉnh thành *
                  </label>
                  <select
                    id="reg-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-hidden focus:border-blue-500"
                  >
                    {CITIES.filter((c) => c !== "Tất cả tỉnh/thành").map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-mode" className="block text-xs font-semibold text-gray-700 mb-1">
                    Hình thức dạy *
                  </label>
                  <select
                    id="reg-mode"
                    value={formData.teachingMode}
                    onChange={(e) => setFormData({ ...formData, teachingMode: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="both">Online & Trực tiếp tại nhà</option>
                    <option value="online">Chỉ dạy Online</option>
                    <option value="offline">Chỉ dạy Trực tiếp tại nhà</option>
                  </select>
                </div>
              </div>

              {/* 4. Kinh nghiệm + Học phí mong muốn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-exp" className="block text-xs font-semibold text-gray-700 mb-1">
                    Kinh nghiệm giảng dạy (số năm) *
                  </label>
                  <input
                    id="reg-exp"
                    type="number"
                    min="0"
                    max="40"
                    required
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label htmlFor="reg-fee" className="block text-xs font-semibold text-gray-700 mb-1">
                    Mức học phí mong muốn / buổi *
                  </label>
                  <input
                    id="reg-fee"
                    type="text"
                    required
                    value={formData.desiredFee}
                    onChange={(e) => setFormData({ ...formData, desiredFee: e.target.value })}
                    placeholder="Ví dụ: 200.000đ/buổi"
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* 5. Giới thiệu ngắn */}
              <div>
                <label htmlFor="reg-bio" className="block text-xs font-semibold text-gray-700 mb-1">
                  Giới thiệu ngắn về bản thân, trình độ và phương pháp sư phạm *
                </label>
                <textarea
                  id="reg-bio"
                  rows={4}
                  required
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Giới thiệu trường đang học/đã tốt nghiệp, thành tích và phương pháp dạy học sinh..."
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Nút gửi form */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98"
                >
                  Nộp hồ sơ đăng ký gia sư
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
