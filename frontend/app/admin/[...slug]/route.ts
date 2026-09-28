import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

/**
 * Route handler for sub-paths under /admin/** (e.g. /admin/sign-in, /admin/dashboard, /admin/students).
 * Redirects the user directly to the corresponding Django backend Admin route, preserving query parameters.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
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

  const { slug } = await context.params;
  const slugPath = slug && slug.length > 0 ? slug.join("/") : "";
  const search = request.nextUrl.search;
  const targetUrl = `${backendUrl}/admin/${slugPath}${search}`;

  return NextResponse.redirect(targetUrl, 307);
}
