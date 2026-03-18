import type { PersistedAppState } from "../types";
import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "./constants";

export function loadPersistedState(): PersistedAppState | null {
  try {
    const raw = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
      .map((key) => window.localStorage.getItem(key))
      .find((value) => value !== null);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PersistedAppState;
  } catch {
    return null;
  }
}

export function savePersistedState(data: PersistedAppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage failures and keep the app usable.
  }
}
