import type { GradeLevelSlug, Tutor } from "@/lib/home-mock-data";
import type { PublicTutor } from "@/lib/edututor-api";

function gradeLevelsFromSubjects(subjects: PublicTutor["subjects"]): GradeLevelSlug[] {
  const levels = new Set<GradeLevelSlug>();

  for (const subject of subjects) {
    const level = (subject.level || "").trim().toLocaleLowerCase("vi-VN");
    if (/thpt|lớp 1[0-2]|lop 1[0-2]|cấp 3|cap 3/.test(level)) levels.add("high-school");
    if (/thcs|lớp [6-9]|lop [6-9]|cấp 2|cap 2/.test(level)) levels.add("secondary");
    if (/tiểu học|tieu hoc|lớp [1-5]|lop [1-5]|cấp 1|cap 1/.test(level)) levels.add("primary");
    if (/đại học|dai hoc|luyện thi|luyen thi|exam/.test(level)) levels.add("exam-prep");
  }

  return levels.size ? [...levels] : ["other"];
}

/** Maps the public API contract to the existing tutor presentation component. */
export function toTutorPresentation(tutor: PublicTutor): Tutor {
  const subjects = tutor.subjects.map((subject) => subject.name);
  const subjectLevels = tutor.subjects.map((subject) => subject.level).filter((level): level is string => Boolean(level));
  const gradeLevels = gradeLevelsFromSubjects(tutor.subjects);
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
    grades: [...new Set(subjectLevels)].join(", ") || "Theo thỏa thuận",
    gradeLevel: gradeLevels[0],
    gradeLevels,
    tutorType: "teacher",
    roleTitle: tutor.headline ?? undefined,
    institution: tutor.institution ?? undefined,
    major: tutor.major ?? (subjects.join(", ") || undefined),
    teachingSubjects: subjects,
    birthYear: tutor.birth_year ?? undefined,
    gender: tutor.gender === "male" || tutor.gender === "female" ? tutor.gender : undefined,
    hometown: tutor.hometown ?? undefined,
    voice: tutor.voice ?? undefined,
    degreeLevel: tutor.education_level ?? undefined,
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
    // Do not invent a biography on a public tutor profile. The tutor's
    // portal owns this data and an empty field should stay visibly empty.
    bio: tutor.bio ?? tutor.headline ?? "Chưa cập nhật giới thiệu.",
    fullBio: tutor.bio ?? undefined,
    reviews: [],
    comments: [],
  };
}
