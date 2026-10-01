/**
 * Resolves the Django backend base URL from environment variables.
 *
 * Priority:
 * 1. NEXT_PUBLIC_BACKEND_URL
 * 2. BACKEND_URL
 * 3. Derived from NEXT_PUBLIC_API_URL (by removing trailing /api)
 *
 * In production, use the deployed EduTutor API when Vercel has not supplied
 * an override. Development still defaults to the local Django server.
 */
export function getBackendUrl(): string {
  let envBackend =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
      : "");

  const runningOnDeployedFrontend = typeof window !== "undefined"
    && !["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (envBackend && runningOnDeployedFrontend && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envBackend)) {
    envBackend = "https://edututor-po0q.onrender.com";
  }
  if (envBackend) {
    return envBackend
      .replace(/^(https?):\/\/localhost(?=:\d+(?:\/|$))/i, "$1://127.0.0.1")
      .replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:8000";
  }

  return "https://edututor-po0q.onrender.com";
}
