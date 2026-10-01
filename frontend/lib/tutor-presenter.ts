import type { Tutor } from "@/lib/home-mock-data";
import type { PublicTutor } from "@/lib/edututor-api";

/** Maps the public API contract to the existing tutor presentation component. */
export function toTutorPresentation(tutor: PublicTutor): Tutor {
  const subjects = tutor.subjects.map((subject) => subject.name);
  const areas = tutor.teaching_areas.map((area) => [area.ward_name, area.province_name].filter(Boolean).join(", "));
  const fee = tutor.hourly_rate_min ?? tutor.hourly_rate_max ?? 0;

  return {
    id: tutor.slug,
    code: `GS-${String(tutor.id).padStart(4, "0")}`,
    name: tutor.name,
    avatarColor: "from-blue-600 to-indigo-600",
    avatarUrl: tutor.avatar ?? undefined,
    initials: tutor.name.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "GS",
    subject: subjects.join(", ") || "Chưa cập nhật",
    grades: "Theo thỏa thuận",
    gradeLevel: "other",
    gradeLevels: ["other"],
    tutorType: "teacher",
    roleTitle: tutor.headline ?? undefined,
    institution: tutor.education_level ?? undefined,
    major: subjects.join(", ") || undefined,
    location: areas.join(", ") || "Trực tuyến",
    city: areas[0] ?? "",
    experience: tutor.experience_years,
    hourlyRate: fee ? `${new Intl.NumberFormat("vi-VN").format(fee)} VNĐ/giờ` : "Thỏa thuận",
    hourlyRateValue: fee,
    rating: tutor.rating_avg,
    reviewCount: tutor.rating_count,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: tutor.teaching_mode,
    bio: tutor.bio ?? tutor.headline ?? "Gia sư EduTutor.",
    fullBio: tutor.bio ?? undefined,
    reviews: [],
    comments: [],
  };
}
