import axios from "axios";

// Public recovery calls must not wait for Clerk or import the mock-data bundle.
const recoveryApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
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
