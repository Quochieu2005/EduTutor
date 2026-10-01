import type { ClassListing } from "@/lib/home-mock-data";
import type { TutorJob } from "@/lib/edututor-api";

function formatVnd(value: number | null): string {
  return value == null ? "Thỏa thuận" : `${new Intl.NumberFormat("vi-VN").format(value)} VNĐ/tháng`;
}

/** Maps the public recruitment API contract to the existing class presentation. */
export function toClassPresentation(job: TutorJob): ClassListing {
  const location = [job.ward?.name, job.district?.name, job.province.name].filter(Boolean).join(", ");
  const budget = job.budget_max ?? job.budget_min ?? 0;
  return {
    id: job.slug, postedByType: job.posted_by_type, code: job.slug.toUpperCase(), title: job.title,
    status: job.status === "open" ? "needing" : "with", category: "exam-prep", categoryName: "Lớp cần gia sư",
    grade: job.grade ?? "Theo thỏa thuận", gradeLevel: "other", subject: job.subject.name,
    address: location || "Trực tuyến", city: job.province.name, fee: formatVnd(budget), feeValue: budget,
    schedule: job.schedule_expect ?? "Thỏa thuận sau khi kết nối", sessionsPerWeek: 0,
    sessionDuration: "Theo thỏa thuận", teachingMode: "both", requirements: job.description || "Chưa có yêu cầu bổ sung.",
    description: job.description, contact: "EduTutor", postedDate: new Intl.DateTimeFormat("vi-VN").format(new Date(job.created_at)),
    contractFee: "Theo thỏa thuận", applicationsCount: 0, averageRating: 0, reviewCount: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, reviews: [], comments: [],
  };
}
