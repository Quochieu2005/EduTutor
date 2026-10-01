"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, InfoCircleFilled, CloseOutlined } from "@ant-design/icons";
import { subscribeToasts, type ToastPayload, type ToastType } from "@/lib/toast";

type VisibleToast = ToastPayload & { id: number };

const palette: Record<ToastType, { icon: ReactNode; className: string; defaultTitle: string }> = {
  success: { icon: <CheckCircleFilled />, className: "border-emerald-200 bg-emerald-50 text-emerald-900", defaultTitle: "Thành công" },
  error: { icon: <CloseCircleFilled />, className: "border-rose-200 bg-rose-50 text-rose-900", defaultTitle: "Có lỗi xảy ra" },
  warning: { icon: <ExclamationCircleFilled />, className: "border-amber-200 bg-amber-50 text-amber-900", defaultTitle: "Lưu ý" },
  info: { icon: <InfoCircleFilled />, className: "border-blue-200 bg-blue-50 text-blue-900", defaultTitle: "Thông báo" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<VisibleToast[]>([]);

  useEffect(() => subscribeToasts((payload) => {
    const id = Date.now() + Math.random();
    const next: VisibleToast = { ...payload, id };
    setToasts((current) => [...current.slice(-3), next]);
    const timeout = window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, payload.duration ?? 4500);
    return () => window.clearTimeout(timeout);
  }), []);

  return (
    <>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,390px)] flex-col gap-3" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => {
          const style = palette[item.type];
          return (
            <div key={item.id} role={item.type === "error" ? "alert" : "status"} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm ${style.className}`}>
              <span className="mt-0.5 text-lg">{style.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{item.title ?? style.defaultTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-90">{item.message}</p>
              </div>
              <button type="button" aria-label="Đóng thông báo" className="opacity-60 transition hover:opacity-100" onClick={() => setToasts((current) => current.filter((toast) => toast.id !== item.id))}>
                <CloseOutlined className="text-xs" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

