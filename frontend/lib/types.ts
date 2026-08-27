export type UserRole = "student" | "tutor" | "admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}

export type TutorStatus = "pending" | "approved" | "rejected";

export interface TutorProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  education?: string;
  teachingMode?: "online" | "offline" | "both";
  bio: string;
  subjects: string[];
  targetGrades?: string[];
  location: string;
  hourlyRate: number;
  experience: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  status?: TutorStatus;
  avatarUrl?: string;
  appliedAt?: string;
  activeStudents?: number;
}

export type LessonStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export interface LessonRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  tutorId: string;
  tutorName: string;
  subject: string;
  message: string;
  preferredDate: string;
  preferredTime: string;
  location?: string;
  hourlyRate?: number;
  status: LessonStatus;
  createdAt: string;
  notes?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}

export interface RegisterTutorPayload {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  education: string;
  teachingMode: "online" | "offline" | "both";
  subjects: string[];
  targetGrades: string[];
  location: string;
  hourlyRate: number;
  experience: number;
  bio: string;
  avatarUrl?: string;
}

export interface TutorSearchParams {
  subject?: string;
  location?: string;
  status?: TutorStatus;
}

export interface CreateLessonPayload {
  tutorId: string;
  subject: string;
  message: string;
  preferredDate: string;
  preferredTime: string;
  studentName?: string;
  studentPhone?: string;
  location?: string;
  hourlyRate?: number;
}

export interface UpdateTutorProfilePayload {
  bio: string;
  subjects: string[];
  location: string;
  hourlyRate: number;
  experience: number;
  phone?: string;
  education?: string;
  teachingMode?: "online" | "offline" | "both";
}
