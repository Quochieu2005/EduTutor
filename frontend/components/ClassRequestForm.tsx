"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircleFilled,
  FileTextOutlined,
  LoadingOutlined,
  LoginOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useEduClerk, useEduUser } from "@/lib/auth";
import { getAuthSession, promoteAuthSessionToStudent } from "@/lib/auth-session";
import { edututorApi, type Province, type Subject, type Ward } from "@/lib/edututor-api";
import { toast } from "@/lib/toast";
import { apiErrorMessage } from "@/lib/api";

const GRADE_OPTIONS = [
  "Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5", "Lớp 6", "Lớp 7",
  "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Luyện thi Đại học",
];

const WEEKDAYS = [
  { value: "Thứ 2", label: "T2" },
  { value: "Thứ 3", label: "T3" },
  { value: "Thứ 4", label: "T4" },
  { value: "Thứ 5", label: "T5" },
  { value: "Thứ 6", label: "T6" },
  { value: "Thứ 7", label: "T7" },
  { value: "Chủ nhật", label: "CN" },
];

const PERIODS = [
  { value: "Sáng", label: "Sáng", hint: "06:00–11:30" },
  { value: "Chiều", label: "Chiều", hint: "13:00–17:30" },
  { value: "Tối", label: "Tối", hint: "18:00–21:30" },
] as const;

type FormState = {
  title: string;
  subjectId: string;
  grade: string;
  teachingMode: "online" | "offline" | "both";
  provinceId: string;
  wardId: string;
  budgetMin: string;
  budgetMax: string;
  scheduleSlots: string[];
  startTime: string;
  endTime: string;
  description: string;
};

const initialForm: FormState = {
  title: "", subjectId: "", grade: "", teachingMode: "both", provinceId: "", wardId: "",
  budgetMin: "", budgetMax: "", scheduleSlots: [], startTime: "", endTime: "", description: "",
};

export function ClassRequestForm() {
  const { isSignedIn } = useEduUser();
  const { openSignIn } = useEduClerk();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([edututorApi.subjects({ page_size: 200 }), edututorApi.provinces()])
      .then(([subjectPage, areas]) => {
        if (!active) return;
        setSubjects(subjectPage.results);
        setProvinces(areas);
      })
      .catch(() => active && setError("Không tải được dữ liệu môn học hoặc khu vực. Hãy tải lại trang."));
    return () => { active = false; };
  }, []);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleScheduleSlot = (day: string, period: string) => {
    const slot = `${day} (${period})`;
    setForm((current) => ({
      ...current,
      scheduleSlots: (current.scheduleSlots ?? []).includes(slot)
        ? (current.scheduleSlots ?? []).filter((item) => item !== slot)
        : [...(current.scheduleSlots ?? []), slot],
    }));
  };

  const chooseProvince = async (provinceId: string) => {
    update("provinceId", provinceId);
    update("wardId", "");
    const province = provinces.find((item) => String(item.id) === provinceId);
    if (!province) {
      setWards([]);
      return;
    }
    try {
      setWards(await edututorApi.wards(province.slug));
    } catch {
      setWards([]);
      setError("Không tải được xã/phường của tỉnh/thành đã chọn.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isSignedIn) {
      openSignIn({ forceRedirectUrl: "/classes/create" });
      return;
    }
    if (getAuthSession()?.actorType === "tutor") {
      setError("Tài khoản gia sư chỉ có thể đề nghị dạy. Phụ huynh hoặc học viên mới có thể đăng lớp.");
      return;
    }
    const needsLocation = form.teachingMode !== "online";
    if (!form.title.trim() || !form.subjectId || !form.grade || (needsLocation && (!form.provinceId || !form.wardId)) || !form.description.trim()) {
      setError(needsLocation ? "Vui lòng điền tiêu đề, môn học, lớp học, khu vực và mô tả yêu cầu." : "Vui lòng điền tiêu đề, môn học, lớp học và mô tả yêu cầu.");
      return;
    }
    const minimum = form.budgetMin ? Number(form.budgetMin) : null;
    const maximum = form.budgetMax ? Number(form.budgetMax) : null;
    if (minimum !== null && maximum !== null && minimum > maximum) {
      setError("Học phí tối đa phải lớn hơn hoặc bằng học phí tối thiểu.");
      return;
    }

    const scheduleSlots = form.scheduleSlots ?? [];
    if (!scheduleSlots.length) {
      setError("Vui lòng chọn ít nhất một buổi có thể học.");
      return;
    }
    if (!form.startTime || !form.endTime) {
      setError("Vui lòng chọn giờ bắt đầu và giờ kết thúc cho các buổi đã chọn.");
      return;
    }
    if (form.startTime >= form.endTime) {
      setError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    const scheduleExpect = `${scheduleSlots.join(", ")} · ${form.startTime}–${form.endTime}`;

    setSubmitting(true);
    try {
      await edututorApi.createTutorRequest({
        title: form.title.trim(),
        subject_id: Number(form.subjectId),
        grade: form.grade,
        province_id: needsLocation ? Number(form.provinceId) : null,
        ward_id: needsLocation ? Number(form.wardId) : null,
        budget_min: minimum,
        budget_max: maximum,
        schedule_expect: scheduleExpect,
        teaching_mode: form.teachingMode,
        description: form.description.trim(),
      });
      promoteAuthSessionToStudent();
      setSubmitted(true);
      toast.success("Đã đăng lớp. Gia sư phù hợp có thể gửi đề nghị dạy.");
    } catch (requestError: unknown) {
      setError(apiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-center shadow-sm">
        <CheckCircleFilled className="text-4xl text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold text-emerald-950">Đã đăng yêu cầu tìm gia sư</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-emerald-900">
          Yêu cầu của bạn đã có trên bảng Nhận lớp. Gia sư phù hợp sẽ xem và gửi đề nghị dạy.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/classes" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Xem danh sách lớp</Link>
          <button type="button" onClick={() => { setSubmitted(false); setForm(initialForm); }} className="rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-white">Đăng lớp khác</button>
        </div>
      </section>
    );
  }

  return (
    <section id="create-class" className="scroll-mt-28 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={submit} className="min-w-0">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-blue-600"><FileTextOutlined /><span className="text-sm font-bold">Đăng lớp tìm gia sư</span></div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Tạo yêu cầu học của bạn</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Điền nhu cầu học tập rõ ràng để gia sư phù hợp có thể gửi đề nghị dạy.</p>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-semibold text-slate-700">Tiêu đề lớp <span className="text-rose-500">*</span><input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ví dụ: Tìm gia sư Toán lớp 10 tại Thủ Đức" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="text-sm font-semibold text-slate-700">Môn học <span className="text-rose-500">*</span><select value={form.subjectId} onChange={(event) => update("subjectId", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500"><option value="">Chọn môn học</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Lớp học <span className="text-rose-500">*</span><select value={form.grade} onChange={(event) => update("grade", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500"><option value="">Chọn lớp học</option>{GRADE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="sm:col-span-2 text-sm font-semibold text-slate-700">Hình thức học <span className="text-rose-500">*</span><select value={form.teachingMode} onChange={(event) => {
              const value = event.target.value as FormState["teachingMode"];
              setForm((current) => ({ ...current, teachingMode: value, ...(value === "online" ? { provinceId: "", wardId: "" } : {}) }));
              if (value === "online") setWards([]);
            }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500"><option value="both">Online &amp; trực tiếp</option><option value="online">Chỉ học online</option><option value="offline">Chỉ học trực tiếp</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Chọn hình thức gia sư có thể đề nghị dạy.</span></label>
            <label className="text-sm font-semibold text-slate-700">Tỉnh/thành {form.teachingMode !== "online" && <span className="text-rose-500">*</span>}<select disabled={form.teachingMode === "online"} value={form.provinceId} onChange={(event) => void chooseProvince(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><option value="">{form.teachingMode === "online" ? "Không áp dụng khi học online" : "Chọn tỉnh/thành"}</option>{provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Xã/phường {form.teachingMode !== "online" && <span className="text-rose-500">*</span>}<select disabled={form.teachingMode === "online" || !form.provinceId} value={form.wardId} onChange={(event) => update("wardId", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><option value="">{form.teachingMode === "online" ? "Không áp dụng khi học online" : "Chọn xã/phường"}</option>{wards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Học phí từ (VNĐ/tháng)<input min="0" type="number" value={form.budgetMin} onChange={(event) => update("budgetMin", event.target.value)} placeholder="Ví dụ: 1500000" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500" /></label>
            <label className="text-sm font-semibold text-slate-700">Học phí đến (VNĐ/tháng)<input min="0" type="number" value={form.budgetMax} onChange={(event) => update("budgetMax", event.target.value)} placeholder="Ví dụ: 2500000" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500" /></label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-semibold text-slate-700">Lịch học mong muốn</legend>
              <p className="mt-1 text-xs text-slate-500">Chọn ngày và buổi có thể học như lịch của gia sư, rồi xác định khung giờ bên dưới.</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200" role="group" aria-label="Buổi học mong muốn">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-8 bg-slate-50 text-center text-xs font-bold text-slate-600">
                    <span className="px-2 py-2.5 text-left">Buổi</span>
                    {WEEKDAYS.map((day) => <span key={day.value} className="border-l border-slate-200 px-2 py-2.5">{day.label}</span>)}
                  </div>
                  {PERIODS.map((period) => <div key={period.value} className="grid grid-cols-8 border-t border-slate-200 text-center">
                    <span className="px-2 py-2 text-left text-xs font-semibold text-slate-700">{period.label}<span className="mt-0.5 block text-[10px] font-normal text-slate-400">{period.hint}</span></span>
                    {WEEKDAYS.map((day) => {
                      const slot = `${day.value} (${period.value})`;
                      const selected = (form.scheduleSlots ?? []).includes(slot);
                      return <button key={slot} type="button" aria-pressed={selected} onClick={() => toggleScheduleSlot(day.value, period.value)} className={`m-1.5 h-9 rounded-lg border text-sm font-bold transition-colors ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50"}`}>{selected ? "✓" : ""}</button>;
                    })}
                  </div>)}
                </div>
              </div>
            </fieldset>
            <label className="text-sm font-semibold text-slate-700">Giờ bắt đầu <span className="text-rose-500">*</span><input disabled={!(form.scheduleSlots ?? []).length} type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50" /></label>
            <label className="text-sm font-semibold text-slate-700">Giờ kết thúc <span className="text-rose-500">*</span><input disabled={!(form.scheduleSlots ?? []).length} min={form.startTime || undefined} type="time" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50" /></label>
            <label className="sm:col-span-2 text-sm font-semibold text-slate-700">Mô tả yêu cầu <span className="text-rose-500">*</span><textarea rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Nêu trình độ hiện tại, mục tiêu học, hình thức học và yêu cầu đối với gia sư..." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          </div>
          <button type="submit" disabled={submitting} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"><SendOutlined />{submitting ? <><LoadingOutlined className="animate-spin" />Đang đăng lớp...</> : "Đăng yêu cầu tìm gia sư"}</button>
        </form>

        <aside className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-sm text-slate-700">
          <h2 className="font-bold text-slate-900">Sau khi đăng lớp</h2>
          <ol className="mt-4 space-y-4 leading-relaxed"><li><strong className="text-blue-700">1. Lớp được công khai</strong><br />Yêu cầu xuất hiện trong bảng Nhận lớp.</li><li><strong className="text-blue-700">2. Gia sư gửi đề nghị</strong><br />Gia sư phù hợp xem thông tin và chủ động ứng tuyển.</li><li><strong className="text-blue-700">3. EduTutor hỗ trợ kết nối</strong><br />Bạn xem đề nghị và thống nhất lịch học với gia sư.</li></ol>
          {!isSignedIn && <button type="button" onClick={() => openSignIn({ forceRedirectUrl: "/classes/create" })} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"><LoginOutlined />Đăng nhập để đăng lớp</button>}
        </aside>
      </div>
    </section>
  );
}
