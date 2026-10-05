export type ClassCategorySlug =
  | "primary"
  | "secondary"
  | "high-school"
  | "foreign-language"
  | "talent"
  | "exam-prep";
export interface ClassReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}
export interface ClassComment {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  content: string;
  date: string;
  replies?: ClassComment[];
}
export interface ClassListing {
  id: string;
  postedByType?: "admin" | "parent" | "student";
  code: string;
  title: string;
  status: "needing" | "with";
  category: ClassCategorySlug;
  categoryName: string;
  grade: string;
  gradeLevel: "primary" | "secondary" | "high-school" | "exam-prep" | "other";
  subject: string;
  address: string;
  city: string;
  fee: string;
  feeValue: number;
  schedule: string;
  sessionsPerWeek: number;
  sessionDuration: string;
  teachingMode: "online" | "offline" | "both";
  requirements: string;
  description: string;
  contact: string;
  postedDate?: string;
  contractFee?: string;
  applicationsCount?: number;
  tutorName?: string;
  tutorBio?: string;
  tutorId?: string;
  capacity?: number;
  enrolled?: number;
  classStatus?: "open" | "paused" | "ended";
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
  reviews: ClassReview[];
  comments: ClassComment[];
}
export type GradeLevelSlug =
  | "primary"
  | "secondary"
  | "high-school"
  | "exam-prep"
  | "other";
export type TutorType = "student" | "teacher";
export type DayPeriod = "morning" | "afternoon" | "evening";
export interface TutorReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}
export interface TutorComment {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  content: string;
  date: string;
  replies?: TutorComment[];
}
export interface TutorOpenClass {
  id: string;
  tutorId: string;
  title: string;
  subject: string;
  grade: string;
  teachingMode: "online" | "offline" | "both";
  schedule: string;
  fee: string;
  capacity: number;
  enrolled: number;
}
export interface Tutor {
  id: string;
  code?: string;
  name: string;
  avatarColor: string;
  avatarUrl?: string;
  initials: string;
  subject: string;
  grades: string;
  gradeLevel?: GradeLevelSlug;
  gradeLevels: GradeLevelSlug[];
  tutorType: TutorType;
  roleTitle?: string;
  institution?: string;
  major?: string;
  birthYear?: number;
  gender?: "male" | "female";
  hometown?: string;
  voice?: string;
  degreeLevel?: string;
  achievements?: string[];
  teachingSubjects?: string[];
  teachingAreas?: string[];
  availability?: Record<number, DayPeriod[]>;
  location: string;
  city: string;
  experience: number;
  hourlyRate: string;
  hourlyRateValue: number;
  rating: number;
  reviewCount: number;
  ratingBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
  isVerified: boolean;
  teachingMode: "online" | "offline" | "both";
  bio: string;
  fullBio?: string;
  reviews: TutorReview[];
  comments: TutorComment[];
}
export function getTutorCode(tutor: Tutor) {
  if (tutor.code) return tutor.code;
  const num = tutor.id.replace(/\D/g, "");
  return `GS-${num ? num.padStart(3, "0") : "101"}`;
}
export function getTutorRoleTitle(tutor: Tutor) {
  return (
    tutor.roleTitle ||
    (tutor.tutorType === "teacher" ? "Giáo viên" : "Sinh viên")
  );
}
export function getTutorInstitution(tutor: Tutor) {
  return tutor.institution || "Chưa cập nhật";
}
export function getTutorMajor(tutor: Tutor) {
  return tutor.major || "Chưa cập nhật";
}
export function getTutorBirthYear(tutor: Tutor) {
  return tutor.birthYear ?? null;
}
export function getTutorGender(tutor: Tutor): "male" | "female" | null {
  return tutor.gender ?? null;
}
export function getTutorHometown(tutor: Tutor) {
  return tutor.hometown || "Chưa cập nhật";
}
export function getTutorDegree(tutor: Tutor) {
  return tutor.degreeLevel || "Chưa cập nhật";
}
export function getTutorAvailability(
  tutor: Tutor,
): Record<number, DayPeriod[]> {
  return tutor.availability || {};
}
