export interface PlayerTheme {
  accentColor: string;
  heroBackgroundColor: string;
  heroBackgroundImage: string;
  heroTextColor: string;
  heroMutedTextColor: string;
}

const DEFAULT_ACCENT = "#1d7c64";
const DEFAULT_HERO_BASE = "#13332c";
const HERO_TEXT_COLOR = "#f7f1df";
const HERO_MUTED_TEXT_COLOR = "rgba(247, 241, 223, 0.78)";

const EXPIRED_THEME: PlayerTheme = {
  accentColor: "#c66a30",
  heroBackgroundColor: "#871f1f",
  heroBackgroundImage: "linear-gradient(135deg, #871f1f 0%, #c66a30 100%)",
  heroTextColor: HERO_TEXT_COLOR,
  heroMutedTextColor: HERO_MUTED_TEXT_COLOR
};

function normalizeHexColor(color: string | undefined): string {
  if (!color) {
    return DEFAULT_ACCENT;
  }

  const trimmed = color.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    const expanded = trimmed
      .slice(1)
      .split("")
      .map((channel) => `${channel}${channel}`)
      .join("");

    return `#${expanded}`;
  }

  return DEFAULT_ACCENT;
}

function darkenHexColor(hexColor: string, amount = 0.28): string {
  const value = normalizeHexColor(hexColor).slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  const darkened = channels.map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel * (1 - amount))))
  );

  return `#${darkened.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function getPlayerTheme(
  color: string | undefined,
  state: "normal" | "expired" = "normal"
): PlayerTheme {
  if (state === "expired") {
    return EXPIRED_THEME;
  }

  const accentColor = normalizeHexColor(color);
  const heroBackgroundColor = darkenHexColor(accentColor);

  return {
    accentColor,
    heroBackgroundColor,
    heroBackgroundImage: `linear-gradient(135deg, ${heroBackgroundColor} 0%, ${accentColor} 100%)`,
    heroTextColor: HERO_TEXT_COLOR,
    heroMutedTextColor: HERO_MUTED_TEXT_COLOR
  };
}

export const playerThemeDefaults = {
  DEFAULT_ACCENT,
  DEFAULT_HERO_BASE,
  HERO_TEXT_COLOR,
  HERO_MUTED_TEXT_COLOR
};
