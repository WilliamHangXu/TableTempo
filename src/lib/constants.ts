export const STORAGE_KEY = "table-tempo:v1";
export const LEGACY_STORAGE_KEYS = ["table-clock:v1"];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export const DEFAULT_MAIN_TIME_SECONDS = 10 * 60;
export const DEFAULT_OVERTIME_SECONDS = 20;
export const DEFAULT_WARNING_SECONDS = [30, 10, 5];

export const DEFAULT_PLAYER_COLORS = [
  "#d95f2a",
  "#c94b4b",
  "#c38a22",
  "#7a5af8",
  "#2f7de1",
  "#c5467a",
  "#00808a",
  "#b35716"
];


export const BUILTIN_PRESET_DEFINITIONS = [
  { id: "casual", name: "Casual", mainTimeSeconds: 12 * 60, overtimeSeconds: 30 },
  { id: "thinky-euro", name: "Thinky Euro", mainTimeSeconds: 18 * 60, overtimeSeconds: 25 },
  { id: "party-game", name: "Party Game", mainTimeSeconds: 6 * 60, overtimeSeconds: 12 }
] as const;
