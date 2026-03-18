import type { AppearancePreferences, ResolvedTheme, ThemePreference } from "../types";

export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  themePreference: "system"
};

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function normalizeAppearance(
  appearance: Partial<AppearancePreferences> | null | undefined
): AppearancePreferences {
  return {
    themePreference: isThemePreference(appearance?.themePreference)
      ? appearance.themePreference
      : DEFAULT_APPEARANCE.themePreference
  };
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
}

export function getSystemResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}
