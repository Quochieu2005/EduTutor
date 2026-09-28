import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that strictly require user authentication
const isProtectedRoute = createRouteMatcher([
  "/profile(.*)",
  "/lessons(.*)",
]);

const proxy = clerkMiddleware(async (auth, req) => {
  // Never interfere with /admin routes — they are completely handled by Django backend
  if (req.nextUrl.pathname.startsWith("/admin")) {
    return;
  }

  // Protect private user routes like /profile
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export { proxy };
export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
