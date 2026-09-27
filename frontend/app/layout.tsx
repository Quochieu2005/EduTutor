import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTutor - Dịch Vụ Gia Sư Uy Tín & Tận Tâm Hàng Đầu",
  description: "Hệ thống kết nối gia sư chất lượng cao, đội ngũ giỏi chuyên môn, phương pháp hiện đại và học phí minh bạch.",
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
