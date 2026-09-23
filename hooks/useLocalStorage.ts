"use client";

import { useSyncExternalStore, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener("storage", callback);
      return () => window.removeEventListener("storage", callback);
    },
    []
  );

  const getSnapshot = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? item : JSON.stringify(initialValue);
    } catch {
      return JSON.stringify(initialValue);
    }
  }, [key, initialValue]);

  const getServerSnapshot = useCallback(() => JSON.stringify(initialValue), [initialValue]);

  const rawValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (value: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event("storage"));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  let parsed: T;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    parsed = initialValue;
  }

  return [parsed, setValue];
}
