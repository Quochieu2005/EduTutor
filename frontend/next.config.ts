import type { NextConfig } from "next";
import path from "path";

function getBackendUrl(): string {
  const envBackend =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
      : "");

  if (envBackend) {
    return envBackend.replace(/\/+$/, "");
  }

  return process.env.NODE_ENV === "production" ? "" : "http://localhost:8000";
}

const backendUrl = getBackendUrl();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        // Avatar, banner and blog images uploaded by EduTutor admin.
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  ...(backendUrl
    ? {
        async redirects() {
          return [
            {
              source: "/admin",
              destination: `${backendUrl}/admin/sign-in`,
              permanent: false,
            },
            {
              source: "/admin/sign-in",
              destination: `${backendUrl}/admin/sign-in`,
              permanent: false,
            },
            {
              source: "/admin/login",
              destination: `${backendUrl}/admin/login`,
              permanent: false,
            },
            {
              source: "/admin/dashboard",
              destination: `${backendUrl}/admin/dashboard/`,
              permanent: false,
            },
            {
              source: "/admin/:path*",
              destination: `${backendUrl}/admin/:path*`,
              permanent: false,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;

