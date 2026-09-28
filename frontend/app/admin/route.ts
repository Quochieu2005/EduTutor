import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

/**
 * Route handler for /admin.
 * Redirects the user directly to the Django backend's Admin sign-in page.
 */
export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return new NextResponse(
      "Backend URL is not configured. Please set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL in your environment.",
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  const search = request.nextUrl.search;
  const targetUrl = `${backendUrl}/admin/sign-in${search}`;
  return NextResponse.redirect(targetUrl, 307);
}
