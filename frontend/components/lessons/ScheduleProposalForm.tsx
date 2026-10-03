"use client";

import { useEffect, useMemo, useState } from "react";
import type { LessonRequest, ScheduleProposalPayload } from "@/lib/types";
import { edututorApi, type Province, type Ward } from "@/lib/edututor-api";

type Props = {
  lesson: LessonRequest;
  counterpartName: string;
  proposalRole: "learner" | "learner-counter" | "tutor-counter";
  availability?: Array<{ weekday: number; period: "morning" | "afternoon" | "evening" }>;
  onSubmit: (payload: ScheduleProposalPayload) => Promise<void> | void;
  onCancel: () => void;
};

type SelectedScheduleSlot = {
  key: string;
  weekday: number;
  period: "morning" | "afternoon" | "evening";
  startTime: string;
  endTime: string;
};

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const periodLabel = { morning: "Sáng", afternoon: "Chiều", evening: "Tối" };
const weekdayLabel = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const defaultTimeForPeriod = (period: "morning" | "afternoon" | "evening") => period === "morning"
  ? { startTime: "08:00", endTime: "10:00" }
  : period === "afternoon"
    ? { startTime: "14:00", endTime: "16:00" }
    : { startTime: "19:00", endTime: "21:00" };
const periodBounds = (period: "morning" | "afternoon" | "evening") => period === "morning"
  ? { min: "05:00", maxStart: "11:59", maxEnd: "12:00" }
  : period === "afternoon"
    ? { min: "12:00", maxStart: "17:59", maxEnd: "18:00" }
    : { min: "18:00", maxStart: "22:59", maxEnd: "23:00" };
const localDate = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

export function ScheduleProposalForm({ lesson, counterpartName, proposalRole, availability = lesson.tutorAvailability ?? [], onSubmit, onCancel }: Props) {
  const isCounterProposal = proposalRole !== "learner";
  const today = localDate(new Date());
  const latestDate = localDate(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
  const [mode, setMode] = useState<"online" | "offline">(lesson.mode ?? "online");
  const [date, setDate] = useState(lesson.preferredDate ?? "");
  const [selectedSlots, setSelectedSlots] = useState<SelectedScheduleSlot[]>([]);
  const [meetingUrl, setMeetingUrl] = useState(lesson.meetingUrl ?? "");
  const [provinceId, setProvinceId] = useState("");
  const [wardId, setWardId] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    edututorApi.provinces().then((items) => active && setProvinces(items)).catch(() => active && setError("Không tải được danh mục tỉnh/thành."));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const province = provinces.find((item) => String(item.id) === provinceId);
    if (!province) { setWards([]); setWardId(""); return; }
    let active = true;
    edututorApi.wards(province.slug).then((items) => active && setWards(items)).catch(() => active && setWards([]));
    return () => { active = false; };
  }, [provinceId, provinces]);

  useEffect(() => {
    const area = lesson.tutorAreas?.[0];
    if (mode !== "offline" || !area || provinceId) return;
    setProvinceId(String(area.provinceId));
  }, [lesson.tutorAreas, mode, provinceId]);

  useEffect(() => {
    const area = lesson.tutorAreas?.[0];
    if (mode !== "offline" || !area?.wardId || wardId) return;
    if (wards.some((ward) => Number(ward.id) === area.wardId)) setWardId(String(area.wardId));
  }, [lesson.tutorAreas, mode, wardId, wards]);

  const location = useMemo(() => {
    const province = provinces.find((item) => String(item.id) === provinceId);
    const ward = wards.find((item) => String(item.id) === wardId);
    return [address.trim(), ward?.name, province?.name].filter(Boolean).join(", ");
  }, [address, provinceId, provinces, wardId, wards]);
  const recurrenceEndDate = useMemo(() => {
    if (!date) return "";
    const start = new Date(`${date}T12:00:00`);
    return localDate(new Date(start.getTime() + 31 * 24 * 60 * 60 * 1000));
  }, [date]);

  // A learner must choose from the tutor's published weekly availability.
  // Never fall back to the old free-form one-off time form: it produced
  // schedules that the tutor had not actually made available.
  const hasTutorAvailability = availability.length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!hasTutorAvailability) { setError("Gia sư chưa công khai lịch có thể dạy nên chưa thể gửi lịch học."); return; }
    if (!date) { setError("Vui lòng chọn ngày bắt đầu học."); return; }
    if (!selectedSlots.length) { setError("Hãy chọn ít nhất một ngày học trong lịch rảnh của gia sư."); return; }
    if (isCounterProposal && note.trim().length < 3) { setError("Vui lòng ghi rõ lý do bạn đề xuất lại lịch học."); return; }
    const scheduleSlots: SelectedScheduleSlot[] = selectedSlots;
    if (scheduleSlots.some((slot) => !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime)) { setError("Mỗi ngày học phải có giờ kết thúc sau giờ bắt đầu."); return; }
    const invalidSlot = scheduleSlots.find((slot) => {
      const bounds = periodBounds(slot.period);
      return slot.startTime < bounds.min || slot.startTime > bounds.maxStart || slot.endTime > bounds.maxEnd;
    });
    if (invalidSlot) { setError(`Khung ${weekdayLabel[invalidSlot.weekday]} · ${periodLabel[invalidSlot.period]} phải học trong đúng buổi đã chọn.`); return; }
    if (mode === "online" && !/^https?:\/\//i.test(meetingUrl.trim())) { setError("Buổi online cần liên kết Meet/Zoom hợp lệ bắt đầu bằng http:// hoặc https://."); return; }
    if (mode === "offline" && (!provinceId || !wardId || !address.trim())) { setError("Buổi trực tiếp cần chọn tỉnh/thành, xã/phường và nhập số nhà/tên đường cụ thể."); return; }
    setSaving(true);
    try {
      await onSubmit({
        preferredDate: date, preferredTime: scheduleSlots[0].startTime, endTime: scheduleSlots[0].endTime, mode,
        weeklySlots: scheduleSlots.map(({ weekday, period, startTime: slotStart, endTime: slotEnd }) => ({ weekday, period, startTime: slotStart, endTime: slotEnd })), recurrenceEndDate,
        ...(isCounterProposal ? { note: note.trim() } : {}),
        ...(mode === "online" ? { meetingUrl: meetingUrl.trim() } : { location, provinceId: Number(provinceId), wardId: Number(wardId), address: address.trim() }),
      });
    } catch (submitError) {
      const message = submitError instanceof Error && submitError.message.trim()
        ? submitError.message
        : "Không thể chốt lịch học lúc này. Vui lòng thử lại.";
      setError(message);
    } finally { setSaving(false); }
  }

  if (!hasTutorAvailability) return <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">Chưa thể chọn lịch với {counterpartName}</h3><p className="mt-1 text-sm leading-6 text-slate-600">Gia sư này chưa cập nhật lịch có thể dạy. Lịch học chỉ được gửi khi bạn chọn các khung giờ gia sư đã công khai.</p></div><button type="button" onClick={onCancel} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Đóng</button></div>
    <div className="mt-4 flex justify-end"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Quay lại chọn gia sư</button></div>
  </section>;

  return <form onSubmit={submit} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{proposalRole === "tutor-counter" ? `Đề xuất lịch khác cho ${counterpartName}` : proposalRole === "learner-counter" ? `Gửi lại lịch học tới ${counterpartName}` : `Gửi lịch học tới ${counterpartName}`}</h3><p className="mt-1 text-xs text-slate-500">{proposalRole === "tutor-counter" ? "Bạn đã từ chối lịch cũ. Chọn lịch rảnh khác và ghi lý do để học viên xác nhận." : proposalRole === "learner-counter" ? "Bạn đã từ chối lịch gia sư gửi. Chọn lịch mới trong các khung gia sư có thể dạy và ghi rõ lý do." : "Gửi khung giờ bạn rảnh để gia sư phản hồi. Lịch chỉ được chốt khi gia sư chấp nhận."}</p></div><button type="button" onClick={onCancel} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Đóng</button></div>
    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900"><strong>Lịch có thể dạy của gia sư: </strong>{availability.map((slot) => `${weekdayLabel[slot.weekday]} ${periodLabel[slot.period]}`).join(" · ")}</div>
    <div className="mt-4 grid max-w-md gap-4"><label className="text-sm font-semibold text-slate-700">Ngày bắt đầu học<input required min={today} max={latestDate} type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">Ngày bắt đầu áp dụng lịch học, từ hôm nay đến tối đa 1 tháng.</span></label></div>
    <div className="mt-4"><p className="text-sm font-semibold text-slate-700">Chọn các ngày học theo lịch rảnh của gia sư</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{availability.map((slot) => { const key = `${slot.weekday}-${slot.period}`; const selected = selectedSlots.some((item) => item.key === key); return <button key={key} type="button" aria-pressed={selected} onClick={() => { setError(null); setSelectedSlots((current) => selected ? current.filter((item) => item.key !== key) : [...current, { key, weekday: slot.weekday, period: slot.period, ...defaultTimeForPeriod(slot.period) }]); }} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"}`}>{weekdayLabel[slot.weekday]} · {periodLabel[slot.period]}</button>; })}</div><p className="mt-2 text-xs text-slate-500">Chọn được nhiều ngày và nhiều buổi. Mỗi ô đã chọn có giờ riêng, nên T2 sáng và T4 chiều có thể dùng hai khung giờ khác nhau.</p>{selectedSlots.length > 0 && <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-white p-3"><p className="text-sm font-semibold text-slate-800">Giờ học cho từng ngày đã chọn</p>{selectedSlots.map((slot) => { const bounds = periodBounds(slot.period); return <div key={slot.key} className="grid gap-2 rounded-lg bg-slate-50 p-2.5 sm:grid-cols-[minmax(0,1fr)_180px_180px]"><p className="self-center text-sm font-semibold text-slate-700">{weekdayLabel[slot.weekday]} · {periodLabel[slot.period]}</p><label className="text-xs font-medium text-slate-600">Giờ bắt đầu<input required type="time" min={bounds.min} max={bounds.maxStart} value={slot.startTime} onChange={(event) => setSelectedSlots((current) => current.map((item) => item.key === slot.key ? { ...item, startTime: event.target.value } : item))} className={inputClass} /></label><label className="text-xs font-medium text-slate-600">Giờ kết thúc<input required type="time" min={slot.startTime || bounds.min} max={bounds.maxEnd} value={slot.endTime} onChange={(event) => setSelectedSlots((current) => current.map((item) => item.key === slot.key ? { ...item, endTime: event.target.value } : item))} className={inputClass} /></label></div>; })}</div>}<p className="mt-2 text-xs text-slate-500">Các buổi sẽ được tạo từ ngày bắt đầu đến {recurrenceEndDate ? new Date(`${recurrenceEndDate}T12:00:00`).toLocaleDateString("vi-VN") : "sau một tháng"}.</p></div>
    <fieldset className="mt-4"><legend className="text-sm font-semibold text-slate-700">Hình thức buổi học</legend><div className="mt-2 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setMode("online")} className={`rounded-xl border p-3 text-left text-sm font-semibold ${mode === "online" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}>Học online<span className="mt-1 block text-xs font-normal opacity-80">Cần Meet/Zoom riêng cho buổi này</span></button><button type="button" onClick={() => setMode("offline")} className={`rounded-xl border p-3 text-left text-sm font-semibold ${mode === "offline" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}>Học trực tiếp<span className="mt-1 block text-xs font-normal opacity-80">Cần địa chỉ cụ thể để đến học</span></button></div></fieldset>
    {mode === "online" ? <label className="mt-4 block text-sm font-semibold text-slate-700">Liên kết lớp trực tuyến<input required type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://meet.google.com/..." className={inputClass} /></label> : <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Tỉnh/thành phố<input readOnly value={provinces.find((province) => String(province.id) === provinceId)?.name ?? lesson.tutorAreas?.[0]?.provinceName ?? "Gia sư chưa cập nhật khu vực dạy"} className={`${inputClass} bg-slate-50 text-slate-600`} /></label><label className="text-sm font-semibold text-slate-700">Xã/phường<input readOnly value={wards.find((ward) => String(ward.id) === wardId)?.name ?? lesson.tutorAreas?.[0]?.wardName ?? "Gia sư chưa cập nhật xã/phường"} className={`${inputClass} bg-slate-50 text-slate-600`} /></label><label className="sm:col-span-2 text-sm font-semibold text-slate-700">Địa chỉ cụ thể<input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Số nhà, tên đường, tòa nhà..." className={inputClass} /></label>{location && <p className="sm:col-span-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">Địa chỉ lưu: <strong>{location}</strong></p>}</div>}
    {isCounterProposal && <label className="mt-4 block text-sm font-semibold text-slate-700">{proposalRole === "tutor-counter" ? "Lý do gửi học viên" : "Lý do gửi gia sư"}<textarea required minLength={3} value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} placeholder={proposalRole === "tutor-counter" ? "Ví dụ: Khung bạn chọn đã trùng lịch dạy; tôi có thể dạy theo lịch này..." : "Ví dụ: Lịch cũ trùng giờ học; tôi muốn đổi sang các khung giờ này..."} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>}
    {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
    <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-white">Hủy</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Đang gửi..." : proposalRole === "tutor-counter" ? "Gửi học viên xác nhận" : proposalRole === "learner-counter" ? "Gửi lại cho gia sư" : "Gửi gia sư phản hồi"}</button></div>
  </form>;
}
