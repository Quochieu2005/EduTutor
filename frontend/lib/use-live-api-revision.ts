"use client";

import { useSyncExternalStore } from "react";
import { API_DATA_CHANGED_EVENT } from "./api";
import { invalidatePublicApiCache } from "./edututor-api";

let revision = 0;
let timer: number | null = null;
const listeners = new Set<() => void>();

function publishRevision(invalidateCache = false) {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  if (invalidateCache) invalidatePublicApiCache();
  revision += 1;
  listeners.forEach((listener) => listener());
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") publishRevision(true);
}

function onFocus() {
  publishRevision(true);
}

function onApiDataChanged() {
  // The response interceptor already invalidates the public cache after a
  // successful mutation. Re-render mounted views without clearing it twice.
  publishRevision(false);
}

function start() {
  if (typeof window === "undefined" || timer) return;
  window.addEventListener("focus", onFocus);
  window.addEventListener(API_DATA_CHANGED_EVENT, onApiDataChanged);
  document.addEventListener("visibilitychange", onVisibilityChange);
  // Let each endpoint's TTL decide whether it needs a network request. The
  // old timer invalidated every cache entry every 20s, producing a burst of
  // duplicate API calls on every public page even when nothing had changed.
  timer = window.setInterval(() => publishRevision(false), 60_000);
}

function stop() {
  if (typeof window === "undefined" || !timer || listeners.size) return;
  window.clearInterval(timer);
  timer = null;
  window.removeEventListener("focus", onFocus);
  window.removeEventListener(API_DATA_CHANGED_EVENT, onApiDataChanged);
  document.removeEventListener("visibilitychange", onVisibilityChange);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    stop();
  };
}

export function useLiveApiRevision() {
  return useSyncExternalStore(subscribe, () => revision, () => 0);
}
