"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { registerTutor } from "@/lib/api";
import { LOCATIONS, SUBJECTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/Button";

const GRADE_OPTIONS = [
  "Tiểu học (Lớp 1 - 5)",
  "THCS (Lớp 6 - 8)",
  "Lớp 9 (Luyện thi vào 10)",
  "THPT (Lớp 10 - 11)",
  "Lớp 12 (Ôn thi THPT Quốc Gia)",
  "Luyện thi IELTS / TOEIC",
  "Toán tư duy / Luyện thi Quốc Tế",
  "Lập trình & Tin học ứng dụng",
  "Người đi làm / Sinh viên",
];

export default function BecomeTutorPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "Nam",
    education: "",
    university: "",
    teachingMode: "both" as "online" | "offline" | "both",
    location: "Hà Nội",
    hourlyRate: 200000,
    experience: 2,
    bio: "",
    avatarUrl: "",
  });

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Toán"]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([
    "THCS (Lớp 6 - 8)",
    "Lớp 9 (Luyện thi vào 10)",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  function toggleSubject(s: string) {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleGrade(g: string) {
    setSelectedGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedSubjects.length === 0) {
      alert("Vui lòng chọn ít nhất 01 môn học có thể giảng dạy.");
      return;
    }
    if (selectedGrades.length === 0) {
      alert("Vui lòng chọn ít nhất 01 khối lớp nhận dạy.");
      return;
    }

    setSubmitting(true);
    try {
      const educationFull = formData.university
        ? `${formData.education} - ${formData.university}`
        : formData.education;

      const created = await registerTutor({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        education: educationFull || "Cử nhân Đại học",
        teachingMode: formData.teachingMode,
        subjects: selectedSubjects,
        targetGrades: selectedGrades,
        location: formData.location,
        hourlyRate: Number(formData.hourlyRate),
        experience: Number(formData.experience),
        bio: formData.bio,
        avatarUrl: formData.avatarUrl,
      });

      setSubmittedId(created.id);
    } catch {
      alert("Đã xảy ra lỗi trong quá trình gửi hồ sơ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <div className="min-h-screen bg-gray-50/60 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
            ✓
          </div>
          <span className="inline-block px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3">
            Mã hồ sơ: {submittedId}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
            Đăng Ký Gia Sư Thành Công!
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Cảm ơn bạn đã nộp hồ sơ gia nhập đội ngũ gia sư EduTutor. Hồ sơ của
            bạn đang ở trạng thái <strong>Chờ phê duyệt (Pending)</strong>. Ban
            quản trị sẽ liên hệ phỏng vấn/xác minh trong vòng{" "}
            <strong>24 giờ làm việc</strong>.
          </p>

          <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-left mb-6 text-xs sm:text-sm text-gray-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Kiểm tra email để nhận thông tin hướng dẫn giảng dạy.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>
                Hồ sơ được Admin phê duyệt sẽ hiển thị trên trang tìm kiếm.
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/tutors">
              <Button fullWidth className="sm:w-auto">
                Khám phá gia sư khác
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Banner Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-xs sm:text-sm font-bold shadow-xs">
            <span>🎓</span>
            <span>Gia nhập mạng lưới 500+ Giáo viên &amp; Gia sư xuất sắc</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Đăng Ký Trở Thành{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Gia Sư EduTutor
            </span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Kết nối với hàng ngàn học sinh có nhu cầu học kèm 1-1, chủ động sắp
            xếp thời gian và gia tăng thu nhập từ 150.000đ - 500.000đ+/giờ.
          </p>
        </div>

        {/* 4 Benefits Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
            <span className="text-2xl mb-1.5 block">💰</span>
            <h2 className="font-bold text-xs sm:text-sm text-gray-900">
              Thu nhập hấp dẫn
            </h2>
            <p className="text-2xs text-gray-500 mt-1">150k - 500k+/buổi dạy</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
            <span className="text-2xl mb-1.5 block">⏰</span>
            <h2 className="font-bold text-xs sm:text-sm text-gray-900">
              Lịch dạy linh hoạt
            </h2>
            <p className="text-2xs text-gray-500 mt-1">Chủ động chọn ca dạy</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
            <span className="text-2xl mb-1.5 block">📍</span>
            <h2 className="font-bold text-xs sm:text-sm text-gray-900">
              Khu vực tùy chọn
            </h2>
            <p className="text-2xs text-gray-500 mt-1">
              Dạy tại nhà hoặc Online
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-center">
            <span className="text-2xl mb-1.5 block">🤝</span>
            <h2 className="font-bold text-xs sm:text-sm text-gray-900">
              Hỗ trợ 24/7
            </h2>
            <p className="text-2xs text-gray-500 mt-1">Đồng hành cùng gia sư</p>
          </div>
        </div>

        {/* Main Application Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Thông tin cá nhân */}
            <div>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Thông tin cá nhân &amp; Liên hệ
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Họ và tên đầy đủ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Địa chỉ Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Số điện thoại Zalo / Liên hệ *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tỉnh / Thành phố hoạt động chính *
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Hình thức có thể giảng dạy *
                  </label>
                  <select
                    value={formData.teachingMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teachingMode: e.target.value as
                          | "online"
                          | "offline"
                          | "both",
                      })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="both">Cả dạy tại nhà &amp; Online</option>
                    <option value="offline">Chỉ dạy trực tiếp tại nhà</option>
                    <option value="online">Chỉ dạy Online trực tuyến</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Học vấn & Chuyên môn */}
            <div>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                  2
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Trình độ học vấn &amp; Bằng cấp
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Trình độ hiện tại *
                  </label>
                  <select
                    value={formData.education}
                    onChange={(e) =>
                      setFormData({ ...formData, education: e.target.value })
                    }
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Chọn trình độ --</option>
                    <option value="Sinh viên năm 1 - 2">
                      Sinh viên năm 1 - 2
                    </option>
                    <option value="Sinh viên năm 3 - 4 (Sắp tốt nghiệp)">
                      Sinh viên năm 3 - 4 (Sắp tốt nghiệp)
                    </option>
                    <option value="Cử nhân Đại học đã tốt nghiệp">
                      Cử nhân Đại học đã tốt nghiệp
                    </option>
                    <option value="Giáo viên trường THCS / THPT">
                      Giáo viên trường THCS / THPT
                    </option>
                    <option value="Thạc sĩ / Giảng viên">
                      Thạc sĩ / Giảng viên
                    </option>
                    <option value="Du học sinh / Chứng chỉ quốc tế">
                      Du học sinh / Chứng chỉ quốc tế
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Trường Đại học / Chuyên ngành *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: ĐH Sư Phạm Hà Nội - Khoa Toán"
                    value={formData.university}
                    onChange={(e) =>
                      setFormData({ ...formData, university: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Môn học & Khối lớp */}
            <div>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
                <span className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
                  3
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Môn học &amp; Khối lớp nhận dạy
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Môn học có thể giảng dạy (Chọn 1 hoặc nhiều môn) *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSubject(s)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition border ${
                          selectedSubjects.includes(s)
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400"
                        }`}
                      >
                        {selectedSubjects.includes(s) ? "✓ " : "+ "}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Khối lớp nhận dạy *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGrade(g)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition border ${
                          selectedGrades.includes(g)
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-400"
                        }`}
                      >
                        {selectedGrades.includes(g) ? "✓ " : "+ "}
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Kinh nghiệm, Học phí & Giới thiệu */}
            <div>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  4
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Kinh nghiệm &amp; Mức học phí mong muốn
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Số năm kinh nghiệm giảng dạy *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={40}
                      value={formData.experience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          experience: Number(e.target.value),
                        })
                      }
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Học phí đề xuất (VNĐ / giờ) *
                    </label>
                    <input
                      type="number"
                      required
                      min={50000}
                      step={10000}
                      value={formData.hourlyRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hourlyRate: Number(e.target.value),
                        })
                      }
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Giới thiệu bản thân &amp; Phương pháp giảng dạy *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Chia sẻ về phong cách dạy, thành tích học sinh từng kèm, ưu điểm nổi bật giúp con tiến bộ..."
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    className="w-full p-3.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                Bằng việc nộp đơn, bạn đồng ý với Quy chế hoạt động &amp; Tiêu
                chuẩn gia sư của EduTutor.
              </p>
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full sm:w-auto px-8 h-12 shadow-lg shadow-blue-500/25 bg-gradient-to-r from-blue-600 to-purple-600 font-bold"
              >
                {submitting ? "Đang gửi hồ sơ..." : "Nộp Hồ Sơ Gia Sư →"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
