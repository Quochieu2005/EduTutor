import axios, { type AxiosRequestConfig } from "axios";
import { clearAuthSession, getAuthSession, saveAuthSession, touchAuthSession, type ActorType } from "./auth-session";
import { toast } from "./toast";
import type {
  AuthTokens,
  ChatMessage,
  CreateLessonPayload,
  LessonRequest,
  LoginPayload,
  RegisterPayload,
  RegisterTutorPayload,
  ScheduleSession,
  ScheduleProposalPayload,
  TutorIncomingRequest,
  TutorProfile,
  TutorSearchParams,
  UpdateTutorProfilePayload,
  User,
} from "./types";
import {
  MOCK_ADMIN_CHATS,
  MOCK_LESSONS,
  MOCK_TUTORS,
  MOCK_TUTOR_REQUESTS,
  MOCK_TUTOR_SCHEDULE,
} from "./mock-data";

const defaultApiUrl = process.env.NODE_ENV === "production"
  ? "https://edututor-po0q.onrender.com/api"
  : "http://127.0.0.1:8000/api";

function resolveApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) return defaultApiUrl;
  const normalized = configured.replace(/\/$/, "");
  const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(`${normalized}/`);
  const runningOnDeployedFrontend = typeof window !== "undefined"
    && !["localhost", "127.0.0.1"].includes(window.location.hostname);
  // Django's local dev server is bound to IPv4 (127.0.0.1). Browsers may
  // resolve `localhost` to ::1 first, which surfaces as Axios `Network Error`.
  const localSafeUrl = normalized.replace(
    /^(https?):\/\/localhost(?=:\d+(?:\/|$))/i,
    "$1://127.0.0.1",
  );
  // A stale localhost value in Vercel's environment must not make the
  // production browser call itself. Local development keeps using Django.
  return pointsToLocalhost && runningOnDeployedFrontend ? defaultApiUrl : localSafeUrl;
}

export const API_URL = resolveApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export type EduTutorRequestConfig = AxiosRequestConfig & {
  _edututorSkipAuth?: boolean;
  _edututorSilentToast?: boolean;
  _edututorRetried?: boolean;
};

const publicAuthRequest = {
  _edututorSkipAuth: true,
  _edututorSilentToast: true,
} as EduTutorRequestConfig;

export { requestPasswordReset, resetPassword } from './password-reset-api';
export { edututorApi } from "./edututor-api";

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const session = getAuthSession();
    if (session?.access && !(config as EduTutorRequestConfig)._edututorSkipAuth) {
      config.headers.Authorization = `Bearer ${session.access}`;
      touchAuthSession();
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredToastShown = false;

function apiErrorMessage(error: unknown, status?: number): string {
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu yêu cầu.";
  if (status === 409) return "Thao tác bị trùng hoặc dữ liệu đã được xử lý trước đó.";
  if (status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
  if (status && status >= 500) return "Máy chủ đang bận. Vui lòng thử lại sau.";
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof responseData === "string" && responseData.trim()) return responseData;
  if (responseData && typeof responseData === "object") {
    const detail = (responseData as { detail?: unknown; message?: unknown }).detail
      ?? (responseData as { message?: unknown }).message;
    if (typeof detail === "string" && detail.trim()) return detail;
    const firstFieldError = Object.values(responseData).find((value) => typeof value === "string" || Array.isArray(value));
    if (typeof firstFieldError === "string") return firstFieldError;
    if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === "string") return firstFieldError[0];
  }
  return "Không thể kết nối tới hệ thống. Vui lòng thử lại.";
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as EduTutorRequestConfig | undefined;
    const status = error.response?.status;
    const isClerkExchange = original?.url?.includes("/v1/accounts/clerk/exchange/") ?? false;
    const skipsAuth = original?._edututorSkipAuth ?? false;
    const shouldNotify = typeof window !== "undefined"
      && !isClerkExchange
      && !original?._edututorSilentToast;
    if (isClerkExchange || skipsAuth || typeof window === "undefined" || status !== 401 || !original || original._edututorRetried) {
      if (shouldNotify && (status !== 401 || !sessionExpiredToastShown)) {
        toast.error(apiErrorMessage(error, status));
        if (status === 401) sessionExpiredToastShown = true;
      }
      return Promise.reject(error);
    }

    const session = getAuthSession();
    if (!session?.refresh || original.url?.includes("/refresh/")) {
      if (shouldNotify) toast.error(apiErrorMessage(error, status));
      return Promise.reject(error);
    }
    original._edututorRetried = true;
    refreshPromise ??= (async () => {
      try {
        const endpoint = session.actorType === "tutor"
          ? "/v1/tutors/auth/refresh/"
          : "/v1/accounts/refresh/";
        const { data } = await axios.post(`${API_URL}${endpoint}`, { refresh: session.refresh }, {
          headers: { "Content-Type": "application/json" },
        });
        const next = {
          access: data.access,
          refresh: data.refresh,
          actorType: (data.actor_type ?? session.actorType) as ActorType,
          account: data.account ?? data.user ?? data.tutor ?? session.account,
          source: session.source,
        };
        saveAuthSession(next);
        sessionExpiredToastShown = false;
        return next.access as string;
      } catch {
        clearAuthSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
    const access = await refreshPromise;
    if (!access) {
      if (shouldNotify && !sessionExpiredToastShown) {
        sessionExpiredToastShown = true;
        toast.error(apiErrorMessage(error, status));
      }
      return Promise.reject(error);
    }
    original.headers = original.headers ?? {};
    original.headers.Authorization = `Bearer ${access}`;
    return api.request(original);
  },
);

function isMockEnabled() {
  return process.env.NEXT_PUBLIC_USE_MOCK === "true";
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
  const { data } = await api.post("/v1/accounts/login/unified/", {
    email: payload.email,
    password: payload.password,
    account_type: payload.accountType ?? "auto",
  }, publicAuthRequest);
  sessionExpiredToastShown = false;
  const account = data.account ?? data.user ?? data.tutor;
  return {
    ...data,
    user: {
      id: String(account.id),
      email: account.email,
      fullName: account.name ?? account.display_name ?? account.username,
      role: data.actor_type === "admin" ? "admin"
        : data.actor_type === "tutor" ? "tutor"
        : data.actor_type === "parent" ? "parent" : "student",
    },
  };
}

export type UnifiedAuthResponse = {
  access: string;
  refresh: string;
  token_type: string;
  expires_in: number;
  actor_type: ActorType;
  account: Record<string, unknown>;
};

export async function loginWithSocial(provider: "google" | "facebook", token: string): Promise<UnifiedAuthResponse> {
  const { data } = await api.post(`/v1/accounts/${provider}/`, { token }, publicAuthRequest);
  sessionExpiredToastShown = false;
  return {
    ...data,
    actor_type: data.actor_type as ActorType,
    account: data.account as Record<string, unknown>,
  };
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
  const username = payload.fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 50) || "user";
  const { data } = await api.post("/v1/accounts/register/", {
    username,
    display_name: payload.fullName,
    email: payload.email,
    password: payload.password,
    account_type: payload.role === "parent" ? "parent" : "student",
  }, publicAuthRequest);
  sessionExpiredToastShown = false;
  return {
    ...data,
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.display_name ?? data.user.username,
      role: payload.role === "parent" ? "parent" : "student",
      phone: payload.phone,
    },
  };
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
export async function getLessons(currentUser?: User | null): Promise<LessonRequest[]> {
  if (isMockEnabled()) {
    await delay(200);
    const lessons = getPersistedLessons();
    if (!currentUser) return [];
    if (currentUser.role === "admin") return lessons;
    if (currentUser.role === "tutor") {
      const tutorId = getPersistedTutors().find(
        (tutor) => tutor.userId === currentUser.id,
      )?.id;
      return tutorId ? lessons.filter((lesson) => lesson.tutorId === tutorId) : [];
    }
    return lessons.filter((lesson) => lesson.studentId === currentUser.id);
  }
  const { data } = await api.get("/v1/lessons/");
  return Array.isArray(data) ? data : data.results ?? [];
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
  const { data } = await api.post("/v1/lessons/", payload);
  return data;
}

export async function updateLessonStatus(
  id: string,
  status: LessonRequest["status"],
  currentUser?: User | null,
): Promise<LessonRequest> {
  if (isMockEnabled()) {
    await delay(200);
    const lessons = getPersistedLessons();
    const tutorId = currentUser && currentUser.role === "tutor"
      ? getPersistedTutors().find((tutor) => tutor.userId === currentUser.id)?.id
      : undefined;
    let updatedLesson: LessonRequest | null = null;
    const updated = lessons.map((l) => {
      if (l.id === id) {
        if (status === "completed" && (!tutorId || l.tutorId !== tutorId)) {
          return l;
        }
        updatedLesson = { ...l, status };
        return updatedLesson;
      }
      return l;
    });
    savePersistedLessons(updated);
    if (!updatedLesson) throw new Error("Không tìm thấy buổi học");
    return updatedLesson;
  }
  const { data } = await api.patch(`/v1/lessons/${id}/`, { status }, {
    _edututorSilentToast: true,
  } as EduTutorRequestConfig);
  return data;
}

export async function proposeLessonSchedule(
  id: string,
  payload: ScheduleProposalPayload,
): Promise<LessonRequest> {
  const { data } = await api.put(`/v1/lessons/${id}/proposal/`, payload, {
    _edututorSilentToast: true,
  } as EduTutorRequestConfig);
  return data;
}

export async function getPublishedTutorAvailability(slug: string): Promise<{
  tutor: { id: number; slug: string; name: string };
  slots: Array<{ weekday: number; period: "morning" | "afternoon" | "evening" }>;
}> {
  const { data } = await api.get(`/v1/tutors/${slug}/availability/`);
  return data;
}

export async function applyForClass(jobSlug: string, coverLetter = "") {
  const { data } = await api.post(`/v1/tutors/jobs/${jobSlug}/apply/`, {
    cover_letter: coverLetter,
  });
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

// -------------------------------------------------------------
// TUTOR PORTAL APIS (Thời khóa biểu, Yêu cầu, Chat Admin)
// -------------------------------------------------------------

function getPersistedSchedule(): ScheduleSession[] {
  if (typeof window === "undefined") return MOCK_TUTOR_SCHEDULE;
  try {
    const saved = localStorage.getItem("edututor_tutor_schedule");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore error
  }
  return MOCK_TUTOR_SCHEDULE;
}

function savePersistedSchedule(schedule: ScheduleSession[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("edututor_tutor_schedule", JSON.stringify(schedule));
    } catch {
      // Ignore error
    }
  }
}

export async function getTutorSchedule(): Promise<ScheduleSession[]> {
  if (isMockEnabled()) {
    await delay(200);
    return getPersistedSchedule();
  }
  const { data } = await api.get("/tutors/me/schedule/");
  return data;
}

export async function updateScheduleSessionStatus(
  id: string,
  status: ScheduleSession["status"],
): Promise<ScheduleSession> {
  if (isMockEnabled()) {
    await delay(200);
    const list = getPersistedSchedule();
    let updated: ScheduleSession | null = null;
    const newList = list.map((s) => {
      if (s.id === id) {
        updated = { ...s, status };
        return updated;
      }
      return s;
    });
    savePersistedSchedule(newList);
    if (!updated) throw new Error("Không tìm thấy ca học");
    return updated;
  }
  const { data } = await api.patch(`/tutors/me/schedule/${id}/`, { status });
  return data;
}

function getPersistedRequests(): TutorIncomingRequest[] {
  if (typeof window === "undefined") return MOCK_TUTOR_REQUESTS;
  try {
    const saved = localStorage.getItem("edututor_tutor_requests");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore error
  }
  return MOCK_TUTOR_REQUESTS;
}

function savePersistedRequests(requests: TutorIncomingRequest[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("edututor_tutor_requests", JSON.stringify(requests));
    } catch {
      // Ignore error
    }
  }
}

export async function getTutorIncomingRequests(): Promise<
  TutorIncomingRequest[]
> {
  if (isMockEnabled()) {
    await delay(200);
    return getPersistedRequests();
  }
  const { data } = await api.get("/tutors/me/requests/");
  return data;
}

export async function respondToIncomingRequest(
  id: string,
  status: "accepted" | "declined",
): Promise<TutorIncomingRequest> {
  if (isMockEnabled()) {
    await delay(250);
    const list = getPersistedRequests();
    let updated: TutorIncomingRequest | null = null;
    const newList = list.map((r) => {
      if (r.id === id) {
        updated = { ...r, status };
        return updated;
      }
      return r;
    });
    savePersistedRequests(newList);

    // If accepted and has schedule details, automatically append to schedule!
    if (status === "accepted" && updated) {
      const schedule = getPersistedSchedule();
      const newSession: ScheduleSession = {
        id: `sch-${Date.now()}`,
        studentName: (updated as TutorIncomingRequest).senderName,
        studentPhone: (updated as TutorIncomingRequest).senderContact,
        studentAvatar: (updated as TutorIncomingRequest).avatar || "👨‍🎓",
        subject: (updated as TutorIncomingRequest).subject || "Toán",
        gradeLevel: (updated as TutorIncomingRequest).gradeLevel,
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        dayOfWeek: "Ngày mai",
        time:
          (updated as TutorIncomingRequest).preferredTime || "19:00 - 21:00",
        duration: "120 phút",
        location: (updated as TutorIncomingRequest).location || "Google Meet",
        mode: ((updated as TutorIncomingRequest).location || "")
          .toLowerCase()
          .includes("nhà")
          ? "offline"
          : "online",
        // A meeting room belongs to a specific lesson. Never reuse a shared
        // hard-coded Meet URL for a new online session.
        meetingLink: undefined,
        hourlyRate: (updated as TutorIncomingRequest).offeredRate || 250000,
        status: "upcoming",
        notes: (updated as TutorIncomingRequest).content,
      };
      savePersistedSchedule([newSession, ...schedule]);
    }

    if (!updated) throw new Error("Không tìm thấy yêu cầu");
    return updated;
  }
  const { data } = await api.patch(`/tutors/me/requests/${id}/`, { status });
  return data;
}

function getPersistedChats(): ChatMessage[] {
  if (typeof window === "undefined") return MOCK_ADMIN_CHATS;
  try {
    const saved = localStorage.getItem("edututor_tutor_admin_chats");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore error
  }
  return MOCK_ADMIN_CHATS;
}

function savePersistedChats(chats: ChatMessage[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("edututor_tutor_admin_chats", JSON.stringify(chats));
    } catch {
      // Ignore error
    }
  }
}

export async function getAdminChatMessages(): Promise<ChatMessage[]> {
  if (isMockEnabled()) {
    await delay(150);
    return getPersistedChats();
  }
  const { data } = await api.get("/tutors/me/chat-admin/");
  return data;
}

export async function sendAdminChatMessage(text: string): Promise<ChatMessage> {
  if (isMockEnabled()) {
    await delay(200);
    const chats = getPersistedChats();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "tutor",
      senderName: "Thầy Nguyễn Văn An",
      text,
      timestamp: new Date().toISOString(),
      isRead: true,
    };
    const updatedChats = [...chats, newMsg];
    savePersistedChats(updatedChats);
    return newMsg;
  }
  const { data } = await api.post("/tutors/me/chat-admin/", { text });
  return data;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
