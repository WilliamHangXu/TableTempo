import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  resolveThemePreference
} from "./appearance";

describe("appearance preferences", () => {
  it("defaults to system theme when persisted appearance is missing", () => {
    expect(normalizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
  });

  it("keeps manual theme overrides", () => {
    expect(normalizeAppearance({ themePreference: "dark" }).themePreference).toBe("dark");
  });

  it("resolves system preference from the device theme", () => {
    expect(resolveThemePreference("system", true)).toBe("dark");
    expect(resolveThemePreference("system", false)).toBe("light");
  });
});
