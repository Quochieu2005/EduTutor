import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTutor",
  description: "EduTutor đang được xây dựng lại",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="vi">
        <body>{children}</body>
      </html>
    </AuthProvider>
  );
}
