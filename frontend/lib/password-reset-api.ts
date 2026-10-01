import axios from "axios";

// Public recovery calls do not require an active EduTutor session.
const defaultApiUrl = process.env.NODE_ENV === "production"
  ? "https://edututor-po0q.onrender.com/api"
  : "http://127.0.0.1:8000/api";
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const configuredIsLocal = configuredApiUrl
  ? /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(`${configuredApiUrl}/`)
  : false;
const runningOnDeployedFrontend = typeof window !== "undefined"
  && !["localhost", "127.0.0.1"].includes(window.location.hostname);
const localSafeConfiguredApiUrl = configuredApiUrl?.replace(
  /^(https?):\/\/localhost(?=:\d+(?:\/|$))/i,
  "$1://127.0.0.1",
);
const recoveryApiUrl = configuredApiUrl && !(configuredIsLocal && runningOnDeployedFrontend)
  ? localSafeConfiguredApiUrl
  : defaultApiUrl;

const recoveryApi = axios.create({
  baseURL: recoveryApiUrl,
  timeout: 25000,
  headers: { "Content-Type": "application/json" },
});

export async function requestPasswordReset(email: string): Promise<string> {
  const { data } = await recoveryApi.post("/v1/accounts/password/forgot/", { email });
  return data.message;
}

export async function resetPassword(payload: {
  token: string;
  new_password: string;
  confirm_password: string;
}): Promise<string> {
  const { data } = await recoveryApi.post("/v1/accounts/password/reset/", payload);
  return data.message;
}

export function recoveryError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail ?? error.response?.data;
    const messages = (value: unknown): string[] => {
      if (typeof value === "string") return [value];
      if (Array.isArray(value)) return value.flatMap(messages);
      if (value && typeof value === "object") return Object.values(value).flatMap(messages);
      return [];
    };
    const text = messages(detail).join(" ");
    if (text) return text;
  }
  return "Không thể kết nối lúc này. Vui lòng thử lại sau; kiểm tra cả hộp thư và thư rác nếu đã yêu cầu gửi email.";
}
