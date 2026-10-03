import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const extensionAttributeCleanup = `
(() => {
  const isInjectedAttribute = (name) =>
    name === "bis_skin_checked" || name === "bis_register" || name.startsWith("__processed_");
  const cleanElement = (element) => {
    if (!(element instanceof Element)) return;
    element.getAttributeNames().forEach((name) => {
      if (isInjectedAttribute(name)) element.removeAttribute(name);
    });
    element.querySelectorAll("*").forEach((child) => {
      child.getAttributeNames().forEach((name) => {
        if (isInjectedAttribute(name)) child.removeAttribute(name);
      });
    });
  };
  cleanElement(document.documentElement);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "attributes") cleanElement(record.target);
      record.addedNodes.forEach(cleanElement);
    });
  });
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  window.addEventListener("DOMContentLoaded", () => setTimeout(() => observer.disconnect(), 0), { once: true });
})();
`;

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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: extensionAttributeCleanup }} />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

