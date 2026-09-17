import { useCallback, useSyncExternalStore } from "react";

export const ACTIVE_PROJECT_STORAGE_KEY = "raven.activeProjectId";
export const SIDEBAR_COLLAPSED_KEY = "raven.sidebarCollapsed";
export const PERSONAL_NAV_OPEN_KEY = "raven.personalNavOpen";
export const MORE_NAV_OPEN_KEY = "raven.moreNavOpen";

const PREFS_EVENT = "raven-prefs";

export function readStoredId(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredId(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch {
    /* ignore */
  }
}

function subscribePrefs(onChange: () => void) {
  window.addEventListener(PREFS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PREFS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useStoredFlag(key: string): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribePrefs,
    () => readStoredId(key) === "1",
    () => false
  );
  const setValue = useCallback(
    (next: boolean) => {
      writeStoredId(key, next ? "1" : "0");
    },
    [key]
  );
  return [value, setValue];
}

export function useStoredId(key: string): string | null {
  return useSyncExternalStore(subscribePrefs, () => readStoredId(key), () => null);
}
