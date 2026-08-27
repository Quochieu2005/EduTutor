import axios from "axios";
import type {
  AuthTokens,
  CreateLessonPayload,
  LessonRequest,
  LoginPayload,
  RegisterPayload,
  RegisterTutorPayload,
  TutorProfile,
  TutorSearchParams,
  UpdateTutorProfilePayload,
  User,
} from "./types";
import { MOCK_LESSONS, MOCK_TUTORS } from "./mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

function isMockEnabled() {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "false") return false;
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return true;
  return process.env.NODE_ENV === "development";
}

// Helper to get / set persisted tutors in mock mode
function getPersistedTutors(): TutorProfile[] {
  if (typeof window === "undefined") return MOCK_TUTORS;
  try {
    const saved = localStorage.getItem("edututor_tutors");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore error
  }
  return MOCK_TUTORS;
}

function savePersistedTutors(tutors: TutorProfile[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("edututor_tutors", JSON.stringify(tutors));
    } catch {
      // Ignore error
    }
  }
}

// Helper to get / set persisted lessons in mock mode
function getPersistedLessons(): LessonRequest[] {
  if (typeof window === "undefined") return MOCK_LESSONS;
  try {
    const saved = localStorage.getItem("edututor_lessons");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore error
  }
  return MOCK_LESSONS;
}

function savePersistedLessons(lessons: LessonRequest[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("edututor_lessons", JSON.stringify(lessons));
    } catch {
      // Ignore error
    }
  }
}

export async function login(
  payload: LoginPayload,
): Promise<AuthTokens & { user: User }> {
  if (isMockEnabled()) {
    await delay(300);
    let role: User["role"] = "student";
    if (payload.email.includes("admin")) {
      role = "admin";
    } else if (payload.email.includes("tutor")) {
      role = "tutor";
    }
    return {
      access: "mock-access-token",
      refresh: "mock-refresh-token",
      user: {
        id: role === "admin" ? "admin-1" : role === "tutor" ? "u1" : "s1",
        email: payload.email,
        fullName:
          role === "admin"
            ? "Quản Trị Viên (Admin)"
            : role === "tutor"
              ? "Nguyễn Văn An"
              : "Hoàng Minh",
        role,
      },
    };
  }
  const { data } = await api.post("/auth/login/", payload);
  return data;
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthTokens & { user: User }> {
  if (isMockEnabled()) {
    await delay(300);
    return {
      access: "mock-access-token",
      refresh: "mock-refresh-token",
      user: {
        id: "new-user",
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
        phone: payload.phone,
      },
    };
  }
  const { data } = await api.post("/auth/register/", payload);
  return data;
}

export async function getTutors(
  params?: TutorSearchParams,
): Promise<TutorProfile[]> {
  if (isMockEnabled()) {
    await delay(200);
    const tutors = getPersistedTutors();
    return tutors.filter((t) => {
      // For public listing, only show approved / verified tutors unless specified
      if (params?.status) {
        if (t.status !== params.status) return false;
      } else {
        if (
          t.status === "rejected" ||
          (t.status === "pending" && !t.isVerified)
        ) {
          return false;
        }
      }
      const matchSubject =
        !params?.subject || t.subjects.some((s) => s.includes(params.subject!));
      const matchLocation =
        !params?.location || t.location.includes(params.location);
      return matchSubject && matchLocation;
    });
  }
  const { data } = await api.get("/tutors/", { params });
  return data;
}

export async function getTutor(id: string): Promise<TutorProfile> {
  if (isMockEnabled()) {
    await delay(150);
    const tutors = getPersistedTutors();
    const tutor = tutors.find((t) => t.id === id);
    if (!tutor) throw new Error("Không tìm thấy gia sư");
    return tutor;
  }
  const { data } = await api.get(`/tutors/${id}/`);
  return data;
}

export async function getMyTutorProfile(): Promise<TutorProfile | null> {
  if (isMockEnabled()) {
    await delay(200);
    const tutors = getPersistedTutors();
    return tutors[0] || null;
  }
  const { data } = await api.get("/tutors/me/");
  return data;
}

export async function updateTutorProfile(
  payload: UpdateTutorProfilePayload,
): Promise<TutorProfile> {
  if (isMockEnabled()) {
    await delay(300);
    const tutors = getPersistedTutors();
    const updatedTutors = tutors.map((t, idx) =>
      idx === 0 ? { ...t, ...payload } : t,
    );
    savePersistedTutors(updatedTutors);
    return updatedTutors[0];
  }
  const { data } = await api.put("/tutors/me/", payload);
  return data;
}

// -------------------------------------------------------------
// TUTOR REGISTRATION (Dành cho gia sư ứng tuyển)
// -------------------------------------------------------------
export async function registerTutor(
  payload: RegisterTutorPayload,
): Promise<TutorProfile> {
  if (isMockEnabled()) {
    await delay(400);
    const newTutor: TutorProfile = {
      id: `t-${Date.now()}`,
      userId: `u-${Date.now()}`,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      gender: payload.gender,
      education: payload.education,
      teachingMode: payload.teachingMode,
      bio: payload.bio,
      subjects: payload.subjects,
      targetGrades: payload.targetGrades,
      location: payload.location,
      hourlyRate: Number(payload.hourlyRate),
      experience: Number(payload.experience),
      rating: 5.0,
      reviewCount: 0,
      isVerified: false,
      status: "pending",
      appliedAt: new Date().toISOString(),
      avatarUrl: payload.avatarUrl,
      activeStudents: 0,
    };
    const tutors = getPersistedTutors();
    const updated = [newTutor, ...tutors];
    savePersistedTutors(updated);
    return newTutor;
  }
  const { data } = await api.post("/tutors/register/", payload);
  return data;
}

// -------------------------------------------------------------
// ADMIN APIS: QUẢN LÝ GIA SƯ & DUYỆT GIA SƯ
// -------------------------------------------------------------
export async function adminGetTutors(): Promise<TutorProfile[]> {
  if (isMockEnabled()) {
    await delay(200);
    return getPersistedTutors();
  }
  const { data } = await api.get("/admin/tutors/");
  return data;
}

export async function adminApproveTutor(id: string): Promise<TutorProfile> {
  if (isMockEnabled()) {
    await delay(200);
    const tutors = getPersistedTutors();
    let approved: TutorProfile | null = null;
    const updated = tutors.map((t) => {
      if (t.id === id) {
        approved = { ...t, isVerified: true, status: "approved" };
        return approved;
      }
      return t;
    });
    savePersistedTutors(updated);
    if (!approved) throw new Error("Gia sư không tồn tại");
    return approved;
  }
  const { data } = await api.patch(`/admin/tutors/${id}/approve/`);
  return data;
}

export async function adminRejectTutor(id: string): Promise<TutorProfile> {
  if (isMockEnabled()) {
    await delay(200);
    const tutors = getPersistedTutors();
    let rejected: TutorProfile | null = null;
    const updated = tutors.map((t) => {
      if (t.id === id) {
        rejected = { ...t, isVerified: false, status: "rejected" };
        return rejected;
      }
      return t;
    });
    savePersistedTutors(updated);
    if (!rejected) throw new Error("Gia sư không tồn tại");
    return rejected;
  }
  const { data } = await api.patch(`/admin/tutors/${id}/reject/`);
  return data;
}

export async function adminDeleteTutor(id: string): Promise<void> {
  if (isMockEnabled()) {
    await delay(200);
    const tutors = getPersistedTutors();
    const updated = tutors.filter((t) => t.id !== id);
    savePersistedTutors(updated);
    return;
  }
  await api.delete(`/admin/tutors/${id}/`);
}

export async function adminUpdateTutor(
  id: string,
  dataPayload: Partial<TutorProfile>,
): Promise<TutorProfile> {
  if (isMockEnabled()) {
    await delay(200);
    const tutors = getPersistedTutors();
    let target: TutorProfile | null = null;
    const updated = tutors.map((t) => {
      if (t.id === id) {
        target = { ...t, ...dataPayload };
        return target;
      }
      return t;
    });
    savePersistedTutors(updated);
    if (!target) throw new Error("Gia sư không tồn tại");
    return target;
  }
  const { data } = await api.put(`/admin/tutors/${id}/`, dataPayload);
  return data;
}

// -------------------------------------------------------------
// LESSONS & CLASS MANAGEMENT (Học viên & Admin)
// -------------------------------------------------------------
export async function getLessons(): Promise<LessonRequest[]> {
  if (isMockEnabled()) {
    await delay(200);
    return getPersistedLessons();
  }
  const { data } = await api.get("/lessons/");
  return data;
}

export const adminGetLessons = getLessons;

export async function createLessonRequest(
  payload: CreateLessonPayload,
): Promise<LessonRequest> {
  if (isMockEnabled()) {
    await delay(300);
    const tutors = getPersistedTutors();
    const tutor = tutors.find((t) => t.id === payload.tutorId);
    const newLesson: LessonRequest = {
      id: `l-${Date.now()}`,
      studentId: "s1",
      studentName: payload.studentName || "Hoàng Minh",
      studentPhone: payload.studentPhone || "0901 234 567",
      tutorId: payload.tutorId,
      tutorName: tutor?.fullName ?? "Gia sư",
      subject: payload.subject,
      message: payload.message,
      preferredDate: payload.preferredDate,
      preferredTime: payload.preferredTime,
      location: payload.location || tutor?.location || "Online",
      hourlyRate: payload.hourlyRate || tutor?.hourlyRate || 200000,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const lessons = getPersistedLessons();
    const updated = [newLesson, ...lessons];
    savePersistedLessons(updated);
    return newLesson;
  }
  const { data } = await api.post("/lessons/", payload);
  return data;
}

export async function updateLessonStatus(
  id: string,
  status: LessonRequest["status"],
): Promise<LessonRequest> {
  if (isMockEnabled()) {
    await delay(200);
    const lessons = getPersistedLessons();
    let updatedLesson: LessonRequest | null = null;
    const updated = lessons.map((l) => {
      if (l.id === id) {
        updatedLesson = { ...l, status };
        return updatedLesson;
      }
      return l;
    });
    savePersistedLessons(updated);
    if (!updatedLesson) throw new Error("Không tìm thấy buổi học");
    return updatedLesson;
  }
  const { data } = await api.patch(`/lessons/${id}/`, { status });
  return data;
}

export async function adminCreateLesson(
  payload: Partial<LessonRequest>,
): Promise<LessonRequest> {
  if (isMockEnabled()) {
    await delay(300);
    const newLesson: LessonRequest = {
      id: `l-${Date.now()}`,
      studentId: payload.studentId || `s-${Date.now()}`,
      studentName: payload.studentName || "Học viên mới",
      studentPhone: payload.studentPhone || "0912 000 111",
      tutorId: payload.tutorId || "t1",
      tutorName: payload.tutorName || "Gia sư phụ trách",
      subject: payload.subject || "Toán",
      message: payload.message || "Lớp học do Admin tạo",
      preferredDate:
        payload.preferredDate || new Date().toISOString().split("T")[0],
      preferredTime: payload.preferredTime || "18:00",
      location: payload.location || "Online",
      hourlyRate: payload.hourlyRate || 200000,
      status: payload.status || "accepted",
      createdAt: new Date().toISOString(),
      notes: payload.notes || "",
    };
    const lessons = getPersistedLessons();
    const updated = [newLesson, ...lessons];
    savePersistedLessons(updated);
    return newLesson;
  }
  const { data } = await api.post("/admin/lessons/", payload);
  return data;
}

export async function adminUpdateLesson(
  id: string,
  payload: Partial<LessonRequest>,
): Promise<LessonRequest> {
  if (isMockEnabled()) {
    await delay(200);
    const lessons = getPersistedLessons();
    let target: LessonRequest | null = null;
    const updated = lessons.map((l) => {
      if (l.id === id) {
        target = { ...l, ...payload };
        return target;
      }
      return l;
    });
    savePersistedLessons(updated);
    if (!target) throw new Error("Không tìm thấy lớp học");
    return target;
  }
  const { data } = await api.put(`/admin/lessons/${id}/`, payload);
  return data;
}

export async function adminDeleteLesson(id: string): Promise<void> {
  if (isMockEnabled()) {
    await delay(200);
    const lessons = getPersistedLessons();
    const updated = lessons.filter((l) => l.id !== id);
    savePersistedLessons(updated);
    return;
  }
  await api.delete(`/admin/lessons/${id}/`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
