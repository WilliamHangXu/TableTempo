import { describe, expect, it } from "vitest";
import { getPlayerTheme, playerThemeDefaults } from "./playerTheme";

describe("getPlayerTheme", () => {
  it("uses the current player color for the active hero theme", () => {
    const theme = getPlayerTheme("#d95f2a");

    expect(theme.accentColor).toBe("#d95f2a");
    expect(theme.heroBackgroundColor).toBe("#9c441e");
    expect(theme.heroBackgroundImage).toContain("#9c441e");
    expect(theme.heroBackgroundImage).toContain("#d95f2a");
    expect(theme.heroTextColor).toBe(playerThemeDefaults.HERO_TEXT_COLOR);
  });

  it("falls back to the default accent color when the input is invalid", () => {
    const theme = getPlayerTheme("not-a-color");

    expect(theme.accentColor).toBe(playerThemeDefaults.DEFAULT_ACCENT);
    expect(theme.heroBackgroundColor).toBe("#155948");
  });

  it("uses the dedicated timeout palette when overtime is expired", () => {
    const theme = getPlayerTheme("#2f7de1", "expired");

    expect(theme.accentColor).toBe("#c66a30");
    expect(theme.heroBackgroundColor).toBe("#871f1f");
    expect(theme.heroBackgroundImage).toBe(
      "linear-gradient(135deg, #871f1f 0%, #c66a30 100%)"
    );
  });
});
