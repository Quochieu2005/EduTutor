"use client";

import { useSyncExternalStore } from "react";
import { API_DATA_CHANGED_EVENT } from "./api";
import { invalidatePublicApiCache } from "./edututor-api";

let revision = 0;
let timer: number | null = null;
const listeners = new Set<() => void>();

function publishRevision() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  invalidatePublicApiCache();
  revision += 1;
  listeners.forEach((listener) => listener());
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") publishRevision();
}

function start() {
  if (typeof window === "undefined" || timer) return;
  window.addEventListener("focus", publishRevision);
  window.addEventListener(API_DATA_CHANGED_EVENT, publishRevision);
  document.addEventListener("visibilitychange", onVisibilityChange);
  timer = window.setInterval(publishRevision, 20_000);
}

function stop() {
  if (typeof window === "undefined" || !timer || listeners.size) return;
  window.clearInterval(timer);
  timer = null;
  window.removeEventListener("focus", publishRevision);
  window.removeEventListener(API_DATA_CHANGED_EVENT, publishRevision);
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
