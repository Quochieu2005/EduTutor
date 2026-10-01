"use client";

import { useEffect, useState } from "react";
import {
  SafetyCertificateFilled,
  CheckCircleFilled,
  LoadingOutlined,
  ArrowRightOutlined,
  StarFilled,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { edututorApi, type Subject } from "@/lib/edututor-api";
import { useEduUser } from "@/lib/auth";
import { toast } from "@/lib/toast";

const GRADE_OPTIONS = [
  "Lớp 1",
  "Lớp 2",
  "Lớp 3",
  "Lớp 4",
  "Lớp 5",
  "Lớp 6",
  "Lớp 7",
  "Lớp 8",
  "Lớp 9",
  "Lớp 10",
  "Lớp 11",
  "Lớp 12",
  "Luyện thi Đại học",
  "Luyện thi Chứng chỉ quốc tế",
];

export function RegistrationSection() {
  const [formData, setFormData] = useState({
    parentName: "",
    email: "",
    phoneNumber: "",
    grade: "",
    subjectId: "",
    provinceId: "",
    wardId: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [provinces, setProvinces] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const [wards, setWards] = useState<Array<{ id: number; slug: string; name: string; type: string }>>([]);
  const { isSignedIn } = useEduUser();

  useEffect(() => {
    Promise.all([edututorApi.subjects({ page_size: 50 }), edututorApi.provinces()])
      .then(([page, areas]) => {
        setSubjects(page.results);
        setProvinces(areas);
      })
      .catch(() => setErrors({ form: "Chưa tải được danh sách môn học. Vui lòng thử lại." }));
  }, []);

  const loadWards = async (provinceId: string) => {
    const province = provinces.find((item) => String(item.id) === provinceId);
    if (!province) {
      setWards([]);
      return;
    }
    try {
      setWards(await edututorApi.wards(province.slug));
    } catch {
      setWards([]);
    }
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!formData.parentName.trim()) {
      err.parentName = "Vui lòng nhập họ và tên phụ huynh.";
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      err.email = "Vui lòng nhập email hợp lệ để EduTutor phản hồi.";
    }
    const phoneRegex = /^[0-9+.\s-]{9,15}$/;
    if (!formData.phoneNumber.trim()) {
      err.phoneNumber = "Vui lòng nhập số điện thoại liên hệ.";
    } else if (!phoneRegex.test(formData.phoneNumber.trim())) {
      err.phoneNumber = "Số điện thoại không hợp lệ (từ 9–11 chữ số).";
    }
    if (!formData.grade) {
      err.grade = "Vui lòng chọn khối lớp học.";
    }
    if (!formData.subjectId) {
      err.subject = "Vui lòng chọn môn học cần gia sư.";
    }
    if (isSignedIn && !formData.provinceId) err.province = "Vui lòng chọn tỉnh/thành.";
    if (isSignedIn && !formData.wardId) err.ward = "Vui lòng chọn xã/phường.";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const selectedSubject = subjects.find((subject) => String(subject.id) === formData.subjectId);
      if (isSignedIn) {
        const province = provinces.find((item) => String(item.id) === formData.provinceId);
        await edututorApi.createTutorRequest({
          subject_id: Number(formData.subjectId),
          province_id: Number(formData.provinceId),
          ward_id: Number(formData.wardId),
          title: `Tìm gia sư ${selectedSubject?.name ?? ""} ${formData.grade}`,
          description: [`Nhu cầu học ${selectedSubject?.name ?? ""} cho ${formData.grade}.`, formData.notes.trim(), `Khu vực: ${province?.name ?? ""}`].filter(Boolean).join(" "),
          grade: formData.grade,
        });
      } else {
        await edututorApi.sendContact({
          parent_name: formData.parentName.trim(),
          email: formData.email.trim(),
          phone: formData.phoneNumber.trim(),
          grade: formData.grade,
          subject_id: Number(formData.subjectId),
          needs_description: [
            `Nhu cầu học thử ${selectedSubject?.name ?? ""} cho ${formData.grade}.`,
            formData.notes.trim(),
          ].filter(Boolean).join(" "),
        });
      }

      setSubmitSuccess(true);
      toast.success(isSignedIn ? "Đã đăng yêu cầu tìm gia sư. Gia sư phù hợp có thể gửi đề nghị dạy." : "Đã gửi yêu cầu tư vấn thành công. EduTutor sẽ sớm liên hệ với bạn.");
      setFormData({
        parentName: "",
        email: "",
        phoneNumber: "",
        grade: "",
        subjectId: "",
        provinceId: "",
        wardId: "",
        notes: "",
      });
      setErrors({});
    } catch {
      setErrors({ form: "Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại!" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="register" className="py-16 sm:py-24 bg-white relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Đăng Ký Dễ Dàng
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Bắt đầu học cùng gia sư phù hợp
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2">
            Tư vấn miễn phí – Học thử trước khi quyết định
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Registration Form (7 cols on lg) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-blue-100 p-6 sm:p-9 shadow-xl shadow-blue-900/5">
            {/* Security Commitment Alert */}
            <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-start gap-3">
              <SafetyCertificateFilled className="text-xl text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs sm:text-sm font-bold text-blue-900">
                  Cam kết bảo mật thông tin
                </strong>
                <p className="text-xs text-blue-800/90 mt-0.5 leading-relaxed">
                  Hơn 3.000+ phụ huynh đã đăng ký tư vấn và tìm được gia sư phù hợp qua EduTutor.
                </p>
              </div>
            </div>

            {submitSuccess ? (
              <div className="py-10 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl shadow-sm">
                  <CheckCircleFilled />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Đăng ký học thử thành công!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Chuyên viên tư vấn của EduTutor sẽ liên hệ với phụ huynh qua số điện thoại đã cung cấp trong vòng <strong>24 giờ làm việc</strong> để sắp xếp lịch học thử phù hợp nhất.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setSubmitSuccess(false)}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Gửi yêu cầu khác
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
                {errors.form && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {errors.form}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tên phụ huynh */}
                  <div>
                    <label htmlFor="parentName" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tên phụ huynh <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="parentName"
                        type="text"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        placeholder="Vui lòng nhập tên"
                        className={`w-full p-3 pl-10 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          errors.parentName
                            ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                      />
                      <UserOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    </div>
                    {errors.parentName && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{errors.parentName}</p>
                    )}
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label htmlFor="phoneNumber" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="Vui lòng nhập số điện thoại"
                        className={`w-full p-3 pl-10 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          errors.phoneNumber
                            ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                      />
                      <PhoneOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    </div>
                    {errors.phoneNumber && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{errors.phoneNumber}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="contactEmail" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email nhận phản hồi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="phuhuynh@example.com"
                    className={`w-full p-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                      errors.email ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {errors.email && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lớp học */}
                  <div>
                    <label htmlFor="gradeSelect" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Lớp học <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="gradeSelect"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm text-slate-900 focus:outline-hidden focus:ring-2 transition-all cursor-pointer ${
                        errors.grade
                          ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white"
                      }`}
                    >
                      <option value="">Chọn lớp học</option>
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {errors.grade && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{errors.grade}</p>
                    )}
                  </div>

                  {/* Môn học */}
                  <div>
                    <label htmlFor="subjectSelect" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Môn học <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="subjectSelect"
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-sm text-slate-900 focus:outline-hidden focus:ring-2 transition-all cursor-pointer ${
                        errors.subject
                          ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white"
                      }`}
                    >
                      <option value="">Chọn môn học</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{errors.subject}</p>
                    )}
                  </div>
                </div>

                {isSignedIn && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="requestProvince" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tỉnh/thành <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="requestProvince"
                        value={formData.provinceId}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, provinceId: value, wardId: "" });
                          void loadWards(value);
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Chọn tỉnh/thành</option>
                        {provinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}
                      </select>
                      {errors.province && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.province}</p>}
                    </div>
                    <div>
                      <label htmlFor="requestWard" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Xã/phường <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="requestWard"
                        value={formData.wardId}
                        onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}
                        disabled={!formData.provinceId || wards.length === 0}
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      >
                        <option value="">Chọn xã/phường</option>
                        {wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
                      </select>
                      {errors.ward && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.ward}</p>}
                    </div>
                  </div>
                )}

                {/* Ghi chú thêm */}
                <div>
                  <label htmlFor="notes" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chia sẻ thêm nhu cầu học tập (nếu có)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ví dụ: Con đang mất gốc Toán, cần luyện thi vào lớp 10 hoặc muốn học online..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingOutlined className="animate-spin text-lg" />
                      <span>Đang xử lý đăng ký...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng ký học thử miễn phí</span>
                      <ArrowRightOutlined />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: 3-step Process (5 cols on lg) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 rounded-3xl border border-blue-100 p-6 sm:p-9 shadow-sm flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Quy trình chỉ với 3 bước đơn giản
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-8">
                EduTutor đồng hành từ lúc tư vấn đến khi học sinh tìm được gia sư phù hợp.
              </p>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md shadow-blue-600/20">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      Đăng ký nhu cầu học tập
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Chia sẻ lớp học, môn học và nhu cầu của học sinh.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md shadow-blue-500/20">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      Tư vấn & chọn gia sư
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      EduTutor liên hệ và đề xuất gia sư phù hợp nhất.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-400 text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md shadow-blue-400/20">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      Học thử miễn phí
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Trải nghiệm trước khi quyết định học chính thức.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="mt-10 pt-6 border-t border-blue-100/80 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-blue-900">
              <StarFilled className="text-blue-500 text-base shrink-0" />
              <span>Học đúng cách quan trọng hơn học thật nhiều.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
