export type ToastType = "success" | "error" | "info" | "warning";

export type ToastPayload = {
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
};

type ToastListener = (toast: ToastPayload) => void;

const listeners = new Set<ToastListener>();

export function subscribeToasts(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(message: string, type: ToastType = "info", options?: Omit<ToastPayload, "message" | "type">) {
  const toast: ToastPayload = { message, type, ...options };
  listeners.forEach((listener) => listener(toast));
}

export const toast = {
  success: (message: string, options?: Omit<ToastPayload, "message" | "type">) => showToast(message, "success", options),
  error: (message: string, options?: Omit<ToastPayload, "message" | "type">) => showToast(message, "error", options),
  info: (message: string, options?: Omit<ToastPayload, "message" | "type">) => showToast(message, "info", options),
  warning: (message: string, options?: Omit<ToastPayload, "message" | "type">) => showToast(message, "warning", options),
};

