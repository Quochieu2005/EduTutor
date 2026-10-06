import axios, { type AxiosRequestConfig } from "axios";
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
  touchAuthSession,
  type ActorType,
} from "./auth-session";
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

const defaultApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://edututor-po0q.onrender.com/api"
    : "http://127.0.0.1:8000/api";

function resolveApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) return defaultApiUrl;
  const normalized = configured.replace(/\/$/, "");
  const pointsToLocalhost =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(`${normalized}/`);
  const deployed =
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname);
  const localSafeUrl = normalized.replace(
    /^(https?):\/\/localhost(?=:\d+(?:\/|$))/i,
    "$1://127.0.0.1",
  );
  return pointsToLocalhost && deployed ? defaultApiUrl : localSafeUrl;
}

export const API_URL = resolveApiUrl();
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

const inFlightApiGets = new Map<string, Promise<unknown>>();
export const API_DATA_CHANGED_EVENT = "edututor:api-data-changed";

export type ApiMutationDetail = {
  method: string;
  url: string;
};

const apiMutationHandlers = new Set<(detail: ApiMutationDetail) => void>();

export function registerApiMutationHandler(
  handler: (detail: ApiMutationDetail) => void,
) {
  apiMutationHandlers.add(handler);
  return () => apiMutationHandlers.delete(handler);
}

/**
 * Coalesce identical GETs that overlap during hydration, React Strict Mode,
 * focus and visibility refreshes. This deliberately does not cache completed
 * authenticated responses, so private account data can never become stale or
 * leak between sessions.
 */
type UntypedApiData = AxiosRequestConfig["data"];

export function dedupedApiGet<T = UntypedApiData>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const sessionKey = typeof window === "undefined"
    ? "server"
    : getAuthSession()?.access ?? "public";
  const params = config?.params && typeof config.params === "object"
    ? JSON.stringify(Object.entries(config.params as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    : "";
  const key = `${sessionKey}:${url}:${params}`;
  const pending = inFlightApiGets.get(key);
  if (pending) return pending as Promise<T>;

  const request = api.get<T>(url, config)
    .then(({ data }) => data)
    .finally(() => inFlightApiGets.delete(key));
  inFlightApiGets.set(key, request);
  return request;
}
export type EduTutorRequestConfig = AxiosRequestConfig & {
  _edututorSkipAuth?: boolean;
  _edututorSilentToast?: boolean;
  _edututorRetried?: boolean;
};
const publicAuthRequest = {
  _edututorSkipAuth: true,
  _edututorSilentToast: true,
} as EduTutorRequestConfig;

export { requestPasswordReset, resetPassword } from "./password-reset-api";
export { edututorApi } from "./edututor-api";

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const session = getAuthSession();
    if (
      session?.access &&
      !(config as EduTutorRequestConfig)._edututorSkipAuth
    ) {
      config.headers.Authorization = `Bearer ${session.access}`;
      touchAuthSession();
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredToastShown = false;

function firstErrorText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstErrorText(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const message = firstErrorText(item);
      if (message) return message;
    }
  }
  return null;
}

export function apiErrorMessage(error: unknown, status?: number): string {
  if (axios.isAxiosError(error) && error.code === "ECONNABORTED")
    return "Máy chủ phản hồi quá chậm. Yêu cầu có thể đã được lưu; vui lòng kiểm tra mục yêu cầu trước khi gửi lại.";
  if (status === 401)
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu yêu cầu.";
  if (status === 409)
    return "Thao tác bị trùng hoặc dữ liệu đã được xử lý trước đó.";
  if (status === 429)
    return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
  if (status && status >= 500) return "Máy chủ đang bận. Vui lòng thử lại sau.";
  const responseData = (error as { response?: { data?: unknown } })?.response
    ?.data;
  const message = firstErrorText(responseData);
  if (message) return message;
  return "Không thể kết nối tới hệ thống. Vui lòng thử lại.";
}

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase() ?? "GET";
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const detail = { method, url: response.config.url ?? "" };
      // A successful write makes overlapping reads and screen snapshots stale.
      // Notify mounted views immediately so users never need to press F5.
      inFlightApiGets.clear();
      apiMutationHandlers.forEach((handler) => handler(detail));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<ApiMutationDetail>(API_DATA_CHANGED_EVENT, { detail }),
        );
      }
    }
    return response;
  },
  async (error) => {
    const original = error.config as EduTutorRequestConfig | undefined;
    const status = error.response?.status;
    const clerkExchange =
      original?.url?.includes("/v1/accounts/clerk/exchange/") ?? false;
    const skipAuth = original?._edututorSkipAuth ?? false;
    const notify =
      typeof window !== "undefined" &&
      !clerkExchange &&
      !original?._edututorSilentToast;
    if (
      clerkExchange ||
      skipAuth ||
      typeof window === "undefined" ||
      status !== 401 ||
      !original ||
      original._edututorRetried
    ) {
      if (notify && (status !== 401 || !sessionExpiredToastShown)) {
        toast.error(apiErrorMessage(error, status));
        if (status === 401) sessionExpiredToastShown = true;
      }
      return Promise.reject(error);
    }
    const session = getAuthSession();
    if (!session?.refresh || original.url?.includes("/refresh/")) {
      if (notify) toast.error(apiErrorMessage(error, status));
      return Promise.reject(error);
    }
    original._edututorRetried = true;
    refreshPromise ??= (async () => {
      try {
        const endpoint =
          session.actorType === "tutor"
            ? "/v1/tutors/auth/refresh/"
            : "/v1/accounts/refresh/";
        const { data } = await axios.post(
          `${API_URL}${endpoint}`,
          { refresh: session.refresh },
          { timeout: 15_000, headers: { "Content-Type": "application/json" } },
        );
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
      if (notify && !sessionExpiredToastShown) {
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

export async function login(
  payload: LoginPayload,
): Promise<AuthTokens & { user: User }> {
  const { data } = await api.post(
    "/v1/accounts/login/unified/",
    {
      email: payload.email,
      password: payload.password,
      account_type: payload.accountType ?? "auto",
    },
    publicAuthRequest,
  );
  sessionExpiredToastShown = false;
  const account = data.account ?? data.user ?? data.tutor;
  return {
    ...data,
    user: {
      id: String(account.id),
      email: account.email,
      fullName: account.name ?? account.display_name ?? account.username,
      role:
        data.actor_type === "admin"
          ? "admin"
          : data.actor_type === "tutor"
            ? "tutor"
            : data.actor_type === "parent"
              ? "parent"
              : data.actor_type === "student"
                ? "student"
                : "user",
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
export async function loginWithSocial(
  provider: "google" | "facebook",
  token: string,
): Promise<UnifiedAuthResponse> {
  const { data } = await api.post(
    `/v1/accounts/${provider}/`,
    { token },
    publicAuthRequest,
  );
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
  const username =
    payload.fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase()
      .slice(0, 50) || "user";
  const { data } = await api.post(
    "/v1/accounts/register/",
    {
      username,
      display_name: payload.fullName,
      email: payload.email,
      password: payload.password,
    },
    publicAuthRequest,
  );
  sessionExpiredToastShown = false;
  return {
    ...data,
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.display_name ?? data.user.username,
      role: "user",
      phone: payload.phone,
    },
  };
}

export async function getTutors(
  params?: TutorSearchParams,
): Promise<TutorProfile[]> {
  return (await api.get("/tutors/", { params })).data;
}
export async function getTutor(id: string): Promise<TutorProfile> {
  return (await api.get(`/tutors/${id}/`)).data;
}
export async function getMyTutorProfile(): Promise<TutorProfile | null> {
  return (await api.get("/tutors/me/")).data;
}
export async function updateTutorProfile(
  payload: UpdateTutorProfilePayload,
): Promise<TutorProfile> {
  return (await api.put("/tutors/me/", payload)).data;
}
export async function registerTutor(
  payload: RegisterTutorPayload,
): Promise<TutorProfile> {
  return (await api.post("/tutors/register/", payload)).data;
}
export async function adminGetTutors(): Promise<TutorProfile[]> {
  return (await api.get("/admin/tutors/")).data;
}
export async function adminApproveTutor(id: string): Promise<TutorProfile> {
  return (await api.patch(`/admin/tutors/${id}/approve/`)).data;
}
export async function adminRejectTutor(id: string): Promise<TutorProfile> {
  return (await api.patch(`/admin/tutors/${id}/reject/`)).data;
}
export async function adminDeleteTutor(id: string): Promise<void> {
  await api.delete(`/admin/tutors/${id}/`);
}
export async function adminUpdateTutor(
  id: string,
  payload: Partial<TutorProfile>,
): Promise<TutorProfile> {
  return (await api.put(`/admin/tutors/${id}/`, payload)).data;
}
export async function getLessons(
  _currentUser?: User | null,
): Promise<LessonRequest[]> {
  void _currentUser;
  const { data } = await api.get("/v1/lessons/");
  return Array.isArray(data) ? data : (data.results ?? []);
}
export const adminGetLessons = getLessons;
export async function createLessonRequest(
  payload: CreateLessonPayload,
): Promise<LessonRequest> {
  return (await api.post("/v1/lessons/", payload)).data;
}
export async function updateLessonStatus(
  id: string,
  status: LessonRequest["status"],
  _currentUser?: User | null,
): Promise<LessonRequest> {
  void _currentUser;
  return (
    await api.patch(`/v1/lessons/${id}/`, { status }, {
      _edututorSilentToast: true,
    } as EduTutorRequestConfig)
  ).data;
}
export async function proposeLessonSchedule(
  id: string,
  payload: ScheduleProposalPayload,
): Promise<LessonRequest> {
  return (
    await api.put(`/v1/lessons/${id}/proposal/`, payload, {
      _edututorSilentToast: true,
    } as EduTutorRequestConfig)
  ).data;
}
export async function getPublishedTutorAvailability(
  slug: string,
): Promise<{
  tutor: { id: number; slug: string; name: string };
  slots: Array<{
    weekday: number;
    period: "morning" | "afternoon" | "evening";
  }>;
}> {
  return (await api.get(`/v1/tutors/${slug}/availability/`)).data;
}
export async function applyForClass(jobSlug: string, coverLetter = "") {
  return (
    await api.post(`/v1/tutors/jobs/${jobSlug}/apply/`, {
      cover_letter: coverLetter,
    })
  ).data;
}
export async function adminCreateLesson(
  payload: Partial<LessonRequest>,
): Promise<LessonRequest> {
  return (await api.post("/admin/lessons/", payload)).data;
}
export async function adminUpdateLesson(
  id: string,
  payload: Partial<LessonRequest>,
): Promise<LessonRequest> {
  return (await api.put(`/admin/lessons/${id}/`, payload)).data;
}
export async function adminDeleteLesson(id: string): Promise<void> {
  await api.delete(`/admin/lessons/${id}/`);
}
export async function getTutorSchedule(): Promise<ScheduleSession[]> {
  return (await api.get("/tutors/me/schedule/")).data;
}
export async function updateScheduleSessionStatus(
  id: string,
  status: ScheduleSession["status"],
): Promise<ScheduleSession> {
  return (await api.patch(`/tutors/me/schedule/${id}/`, { status })).data;
}
export async function getTutorIncomingRequests(): Promise<
  TutorIncomingRequest[]
> {
  return (await api.get("/tutors/me/requests/")).data;
}
export async function respondToIncomingRequest(
  id: string,
  status: "accepted" | "declined",
): Promise<TutorIncomingRequest> {
  return (await api.patch(`/tutors/me/requests/${id}/`, { status })).data;
}
export async function getAdminChatMessages(): Promise<ChatMessage[]> {
  return (await api.get("/tutors/me/chat-admin/")).data;
}
export async function sendAdminChatMessage(text: string): Promise<ChatMessage> {
  return (await api.post("/tutors/me/chat-admin/", { text })).data;
}
