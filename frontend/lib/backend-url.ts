/**
 * Resolves the Django backend base URL from environment variables.
 *
 * Priority:
 * 1. NEXT_PUBLIC_BACKEND_URL
 * 2. BACKEND_URL
 * 3. Derived from NEXT_PUBLIC_API_URL (by removing trailing /api)
 *
 * In production, an environment variable MUST be provided.
 * In development, defaults to http://localhost:8000 for local convenience.
 */
export function getBackendUrl(): string {
  const envBackend =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
      : "");

  if (envBackend) {
    return envBackend.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8000";
  }

  return "";
}
