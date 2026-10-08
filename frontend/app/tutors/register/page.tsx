"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEduUser, useEduClerk } from "@/lib/auth";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { edututorApi, type Province, type Subject } from "@/lib/edututor-api";
import { toast } from "@/lib/toast";
import { useLiveApiRevision } from "@/lib/use-live-api-revision";

export default function TutorRegisterPage() {
  const apiRevision = useLiveApiRevision();
  const { isSignedIn, user } = useEduUser();
  const { openSignIn } = useEduClerk();

  const [formData, setFormData] = useState({
    fullName: "",
    subject: "",
    grades: "",
    city: "",
    teachingMode: "both",
    experience: "3",
    desiredFee: "200.000đ/buổi",
    phone: "",
    bio: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      // Keep the shared public cache key within the API's 100-item limit.
      edututorApi.subjects({ page_size: 100 }),
      edututorApi.provinces(),
    ]).then(([subjectPage, provinceList]) => {
      if (!active) return;
      setSubjects(subjectPage.results);
      setProvinces(provinceList);
      setFormData((current) => ({
        ...current,
        subject: current.subject || subjectPage.results[0]?.name || "",
        city: current.city || provinceList[0]?.name || "",
      }));
    }).catch(() => {
      toast.error("Không tải được danh mục môn học và khu vực. Vui lòng thử lại.");
    });
    return () => { active = false; };
  }, [apiRevision]);

  useEffect(() => {
    if (!user) return;
    // Dữ liệu tài khoản API được tải bất đồng bộ; điền sẵn vào biểu mẫu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((current) => ({
      ...current,
      fullName: current.fullName || user.fullName || "",
      phone: current.phone || user.primaryPhoneNumber?.phoneNumber || "",
    }));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Yêu cầu đăng nhập EduTutor trước khi gửi form.
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    if (!user) return;

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      setSubmitError("Tài khoản chưa có email chính để gửi hồ sơ.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (cvFile && cvFile.size > 10 * 1024 * 1024) {
        setSubmitError("CV phải có dung lượng không quá 10MB.");
        setIsSubmitting(false);
        return;
      }
      const payload = new FormData();
      payload.set("name", formData.fullName || user.fullName || "Ứng viên");
      payload.set("email", email);
      payload.set("phone", formData.phone);
      payload.set(
        "cover_letter",
        [
          `Môn dạy: ${formData.subject}`,
          `Cấp/lớp: ${formData.grades}`,
          `Khu vực: ${formData.city}`,
          `Hình thức: ${formData.teachingMode}`,
          `Kinh nghiệm: ${formData.experience} năm`,
          `Học phí mong muốn: ${formData.desiredFee}`,
          "",
          formData.bio,
        ].join("\n")
      );
      if (cvFile) payload.set("cv_file", cvFile);
      await edututorApi.submitTutorApplication(payload);
      setIsSubmitted(true);
      toast.success("Đã gửi hồ sơ gia sư thành công. Hồ sơ đang chờ EduTutor kiểm duyệt.");
    } catch {
      setSubmitError("Không thể gửi hồ sơ lúc này. Hãy kiểm tra kết nối và đăng nhập lại trước khi thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-blue-600 transition-colors">
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

          {isSubmitted ? (
            <div className="py-10 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-gray-900">Đăng ký thành công!</h2>
              <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                Hồ sơ gia sư của bạn (<strong>{formData.fullName || user?.fullName || "Ứng viên"}</strong>) đã được gửi tới hệ thống EduTutor. Ban quản lý sẽ kiểm duyệt và liên hệ theo thông tin bạn đã cung cấp.
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
                  {submitError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{submitError}</p>}
              {/* Cảnh báo đăng nhập nếu chưa đăng nhập */}
              {!isSignedIn && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <strong className="block font-bold">Yêu cầu đăng nhập tài khoản:</strong>
                    <span>Bạn cần đăng nhập EduTutor trước khi gửi hồ sơ đăng ký gia sư.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSignIn()}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shrink-0 self-start sm:self-auto shadow-xs"
                  >
                    Đăng nhập ngay
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
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.name}>{subject.name}</option>
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

              <div>
                <label htmlFor="reg-phone" className="block text-xs font-semibold text-gray-700 mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ví dụ: 0901 234 567"
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="reg-cv" className="block text-xs font-semibold text-gray-700 mb-1">
                  CV / hồ sơ gia sư (PDF, DOC, DOCX)
                </label>
                <input
                  id="reg-cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                  className="block w-full p-2.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <p className="mt-1 text-[11px] text-gray-500">Không bắt buộc ở form đăng ký chung · tối đa 10MB.</p>
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
                    {provinces.map((province) => (
                      <option key={province.id} value={province.name}>{province.name}</option>
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
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Đang gửi hồ sơ..." : "Nộp hồ sơ đăng ký gia sư"}
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
