import { describe, expect, it } from "vitest";
import { getPlayerTheme, playerThemeDefaults } from "./playerTheme";

describe("getPlayerTheme", () => {
  it("returns light-mode accent tokens for a valid player color", () => {
    const theme = getPlayerTheme("#d95f2a", "light");

    expect(theme.accentColor).toBe("#d95f2a");
    expect(theme.accentTextColor).toBe("#b05026");
    expect(theme.railTrackColor).toBe("rgba(217, 95, 42, 0.16)");
  });

  it("falls back to the default accent color when the input is invalid", () => {
    const theme = getPlayerTheme("not-a-color", "light");

    expect(theme.accentColor).toBe(playerThemeDefaults.DEFAULT_ACCENT);
    expect(theme.borderColor).toBe("rgba(217, 95, 42, 0.26)");
  });

  it("returns stronger overtime accents in dark mode", () => {
    const theme = getPlayerTheme("#2f7de1", "dark", "overtime");

    expect(theme.accentColor).toBe("#2f7de1");
    expect(theme.accentTintStrong).toBe("rgba(47, 125, 225, 0.36)");
    expect(theme.railColor).toBe("#5e98e1");
  });

  it("uses the dedicated timeout palette when overtime is expired", () => {
    const theme = getPlayerTheme("#2f7de1", "dark", "expired");

    expect(theme.accentColor).toBe("#e39175");
    expect(theme.accentTextColor).toBe("#f3b9a4");
    expect(theme.borderColor).toBe("rgba(227, 145, 117, 0.42)");
  });
});
