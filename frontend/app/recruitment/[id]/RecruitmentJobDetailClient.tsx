"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useEduUser } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { edututorApi, type TutorJob } from "@/lib/edututor-api";
import { toast } from "@/lib/toast";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function formatMoney(value: number | null) {
  return value == null ? "Theo thỏa thuận" : `${new Intl.NumberFormat("vi-VN").format(value)} VNĐ/tháng`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function FileField({
  id,
  label,
  required,
  file,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0] ?? null);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={id}
        type="file"
        required={required}
        accept=".pdf,.doc,.docx"
        onChange={handleChange}
        className="block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-blue-400"
      />
      <p className="mt-1 text-xs text-slate-500">
        {file ? file.name : "PDF, DOC hoặc DOCX · tối đa 10MB"}
      </p>
    </div>
  );
}

export default function RecruitmentJobDetailClient({ slug }: { slug: string }) {
  const { user } = useEduUser();
  const [job, setJob] = useState<TutorJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotRecruitment, setIsNotRecruitment] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [educationFile, setEducationFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", coverLetter: "" });

  useEffect(() => {
    let active = true;
    edututorApi.tutorJob(slug)
      .then((data) => {
        if (!active) return;
        if (data.posted_by_type !== "admin") {
          setIsNotRecruitment(true);
        } else {
          setJob(data as TutorJob);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    // Account data arrives asynchronously; hydrate the form once it is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({
      ...current,
      name: current.name || user.fullName || "",
      email: current.email || user.primaryEmailAddress?.emailAddress || "",
      phone: current.phone || user.primaryPhoneNumber?.phoneNumber || "",
    }));
  }, [user]);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!job) return;
    if (!cvFile) {
      setSubmitError("Vui lòng đính kèm CV để gửi hồ sơ cho tin tuyển dụng này.");
      return;
    }
    const files = [cvFile, idCardFile, educationFile].filter(Boolean) as File[];
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      setSubmitError("Mỗi tệp tải lên phải có dung lượng không quá 10MB.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = new FormData();
      payload.set("job_slug", job.slug);
      payload.set("name", form.name.trim());
      payload.set("email", form.email.trim());
      payload.set("phone", form.phone.trim());
      payload.set(
        "cover_letter",
        [
          `Ứng tuyển tin: ${job.title}`,
          `Môn: ${job.subject.name}${job.grade ? ` · ${job.grade}` : ""}`,
          `Khu vực: ${job.ward?.name || job.province?.name || "Trực tuyến"}`,
          "",
          form.coverLetter.trim(),
        ].join("\n"),
      );
      payload.set("cv_file", cvFile);
      if (idCardFile) payload.set("id_card_file", idCardFile);
      if (educationFile) payload.set("education_proof_file", educationFile);
      await edututorApi.submitTutorApplication(payload);
      setIsSubmitted(true);
      toast.success("Đã gửi hồ sơ ứng tuyển. EduTutor sẽ liên hệ sau khi kiểm duyệt.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể gửi hồ sơ lúc này.";
      setSubmitError(message || "Không thể gửi hồ sơ lúc này. Vui lòng thử lại sau.");
      toast.error(message || "Không thể gửi hồ sơ lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return <><Header /><main className="mx-auto min-h-[55vh] max-w-5xl px-4 py-20 text-center text-sm text-slate-500">Đang tải thông tin tuyển dụng...</main><Footer /></>;
  }
  if (loadError || isNotRecruitment || !job) {
    return (
      <><Header /><main className="mx-auto min-h-[55vh] max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Không tìm thấy tin tuyển dụng</h1>
        <p className="mt-2 text-sm text-slate-600">Đường dẫn này không phải tin tuyển dụng do Admin đăng hoặc tin đã đóng.</p>
        <Link href="/recruitment" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Về trang tuyển dụng</Link>
      </main><Footer /></>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600">Trang chủ</Link><span className="mx-2">/</span>
          <Link href="/recruitment" className="hover:text-blue-600">Tuyển dụng gia sư</Link><span className="mx-2">/</span>
          <span className="font-semibold text-slate-800">{job.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Đang tuyển</span>
              <span className="text-xs text-slate-500">Đăng ngày {formatDate(job.created_at)}</span>
            </div>
            <h1 className="mt-5 break-words [overflow-wrap:anywhere] text-3xl font-extrabold tracking-tight text-slate-950">{job.title}</h1>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Môn học / cấp lớp</p><p className="mt-1 font-bold">{job.subject.name}{job.grade ? ` · ${job.grade}` : ""}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Khu vực</p><p className="mt-1 font-bold">{job.ward?.name || job.province?.name || "Trực tuyến"}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Học phí</p><p className="mt-1 font-bold text-blue-700">{job.budget_min != null && job.budget_max != null ? `${formatMoney(job.budget_min)} – ${new Intl.NumberFormat("vi-VN").format(job.budget_max)} VNĐ/tháng` : formatMoney(job.budget_min ?? job.budget_max)}</p></div>
              <div className="min-w-0 rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Lịch dạy mong muốn</p><p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-bold">{job.schedule_expect || "Trao đổi khi phỏng vấn"}</p></div>
            </div>
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h2 className="text-lg font-bold">Mô tả tin tuyển dụng</h2>
              <p className="mt-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-slate-600">{job.description}</p>
            </div>
            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Đây là thông báo tuyển gia sư do Admin EduTutor đăng. Gia sư gửi CV tại biểu mẫu bên cạnh; không dùng luồng “Đề nghị dạy” của bảng Nhận lớp.
            </div>
          </section>

          <section className="h-fit rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-extrabold">Nộp hồ sơ ứng tuyển</h2>
            <p className="mt-1 text-sm text-slate-500">Gửi thông tin và CV để EduTutor xem xét tin tuyển dụng này.</p>
            {isSubmitted ? (
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div>
                <h3 className="mt-4 font-bold text-emerald-900">Đã nhận hồ sơ</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-800">Hồ sơ của bạn đã được ghi nhận cho tin này. EduTutor sẽ liên hệ qua email hoặc số điện thoại đã cung cấp.</p>
                <Link href="/recruitment" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Xem tin tuyển dụng khác</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {submitError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{submitError}</div>}
                <div><label htmlFor="recruitment-name" className="mb-1.5 block text-sm font-semibold">Họ và tên <span className="text-rose-500">*</span></label><input id="recruitment-name" required value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} placeholder="Nguyễn Văn A" /></div>
                <div><label htmlFor="recruitment-email" className="mb-1.5 block text-sm font-semibold">Email nhận phản hồi <span className="text-rose-500">*</span></label><input id="recruitment-email" type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} className={inputClass} placeholder="you@example.com" /></div>
                <div><label htmlFor="recruitment-phone" className="mb-1.5 block text-sm font-semibold">Số điện thoại <span className="text-rose-500">*</span></label><input id="recruitment-phone" type="tel" required value={form.phone} onChange={(event) => update("phone", event.target.value)} className={inputClass} placeholder="0901 234 567" /></div>
                <div><label htmlFor="recruitment-cover" className="mb-1.5 block text-sm font-semibold">Giới thiệu / thư ứng tuyển</label><textarea id="recruitment-cover" rows={5} value={form.coverLetter} onChange={(event) => update("coverLetter", event.target.value)} className={inputClass} placeholder="Kinh nghiệm, thành tích và thời gian có thể nhận lớp..." /></div>
                <FileField id="recruitment-cv" label="CV / hồ sơ gia sư" required file={cvFile} onChange={setCvFile} />
                <FileField id="recruitment-id-card" label="CCCD (không bắt buộc)" file={idCardFile} onChange={setIdCardFile} />
                <FileField id="recruitment-education" label="Bằng cấp / chứng chỉ (không bắt buộc)" file={educationFile} onChange={setEducationFile} />
                <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Đang gửi hồ sơ..." : "Gửi hồ sơ ứng tuyển"}</button>
                <p className="text-center text-xs leading-5 text-slate-500">Thông tin chỉ được dùng để tuyển dụng và được bảo vệ theo chính sách EduTutor.</p>
              </form>
            )}
          </section>
        </div>

      </main>
      <Footer />
    </div>
  );
}
