import type { ResolvedTheme } from "../types";

export type PlayerThemeState = "normal" | "overtime" | "expired";

export interface PlayerTheme {
  accentColor: string;
  accentTint: string;
  accentTintStrong: string;
  accentTextColor: string;
  railColor: string;
  railTrackColor: string;
  borderColor: string;
}

const DEFAULT_ACCENT = "#d95f2a";
const LIGHT_SURFACE_BASE = "#1f1a16";
const DARK_SURFACE_BASE = "#f4ede1";

const EXPIRED_THEME: Record<ResolvedTheme, PlayerTheme> = {
  light: {
    accentColor: "#8b3b2f",
    accentTint: "rgba(139, 59, 47, 0.12)",
    accentTintStrong: "rgba(139, 59, 47, 0.2)",
    accentTextColor: "#7b2f24",
    railColor: "#a94d3d",
    railTrackColor: "rgba(139, 59, 47, 0.18)",
    borderColor: "rgba(139, 59, 47, 0.32)"
  },
  dark: {
    accentColor: "#e39175",
    accentTint: "rgba(227, 145, 117, 0.18)",
    accentTintStrong: "rgba(227, 145, 117, 0.28)",
    accentTextColor: "#f3b9a4",
    railColor: "#efab8c",
    railTrackColor: "rgba(227, 145, 117, 0.26)",
    borderColor: "rgba(227, 145, 117, 0.42)"
  }
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

function toChannels(hexColor: string): [number, number, number] {
  const normalized = normalizeHexColor(hexColor).slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number
  ];
}

function mixHexColor(baseColor: string, mixColor: string, amount: number): string {
  const [baseRed, baseGreen, baseBlue] = toChannels(baseColor);
  const [mixRed, mixGreen, mixBlue] = toChannels(mixColor);
  const channels = [
    Math.round(baseRed * (1 - amount) + mixRed * amount),
    Math.round(baseGreen * (1 - amount) + mixGreen * amount),
    Math.round(baseBlue * (1 - amount) + mixBlue * amount)
  ];

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function rgbaFromHex(hexColor: string, alpha: number): string {
  const [red, green, blue] = toChannels(hexColor);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildThemedAccent(color: string, theme: ResolvedTheme, state: PlayerThemeState): PlayerTheme {
  const isDark = theme === "dark";
  const strongMixTarget = isDark ? DARK_SURFACE_BASE : LIGHT_SURFACE_BASE;
  const strongMixAmount = isDark ? (state === "overtime" ? 0.24 : 0.18) : state === "overtime" ? 0.16 : 0.22;
  const accentStrong = mixHexColor(color, strongMixTarget, strongMixAmount);
  const tintAlpha = isDark ? (state === "overtime" ? 0.26 : 0.18) : state === "overtime" ? 0.18 : 0.12;
  const tintStrongAlpha = isDark ? (state === "overtime" ? 0.36 : 0.28) : state === "overtime" ? 0.26 : 0.2;
  const railAlpha = isDark ? 0.28 : 0.16;
  const borderAlpha = isDark ? (state === "overtime" ? 0.44 : 0.36) : state === "overtime" ? 0.34 : 0.26;

  return {
    accentColor: color,
    accentTint: rgbaFromHex(color, tintAlpha),
    accentTintStrong: rgbaFromHex(color, tintStrongAlpha),
    accentTextColor: accentStrong,
    railColor: state === "overtime" && isDark ? accentStrong : color,
    railTrackColor: rgbaFromHex(color, railAlpha),
    borderColor: rgbaFromHex(color, borderAlpha)
  };
}

export function getPlayerTheme(
  color: string | undefined,
  theme: ResolvedTheme,
  state: PlayerThemeState = "normal"
): PlayerTheme {
  if (state === "expired") {
    return EXPIRED_THEME[theme];
  }

  const accentColor = normalizeHexColor(color);
  return buildThemedAccent(accentColor, theme, state);
}

export const playerThemeDefaults = {
  DEFAULT_ACCENT
};
