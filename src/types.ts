export type TimeoutMode = "alert";

export type GamePhase = "setup" | "running" | "paused" | "finished";

export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export interface AppearancePreferences {
  themePreference: ThemePreference;
}

export interface PlayerConfig {
  id: string;
  name: string;
  color: string;
}

export interface AppConfig {
  players: PlayerConfig[];
  mainTimeSeconds: number;
  overtimeSeconds: number;
  warningSeconds: number[];
  timeoutMode: TimeoutMode;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface SavedPreset {
  id: string;
  name: string;
  config: AppConfig;
}

export interface PlayerStats {
  totalTurnMs: number;
  longestTurnMs: number;
  completedTurns: number;
  overtimeTurns: number;
  timeouts: number;
}

export interface PlayerState extends PlayerConfig {
  remainingMainMs: number;
  remainingOvertimeMs: number;
  isActive: boolean;
  isEliminated: boolean;
  stats: PlayerStats;
}

export interface TurnSnapshot {
  turnNumber: number;
  playerId: string;
  playerName: string;
  durationMs: number;
  endedAtEpochMs: number;
  usedOvertime: boolean;
  overtimeExpired: boolean;
}

export interface UndoSnapshot {
  phase: GamePhase;
  activePlayerId: string | null;
  players: PlayerState[];
  turnNumber: number;
  startedAtMs: number | null;
  lastTickAtMs: number | null;
  persistedAtEpochMs: number | null;
  currentTurnElapsedMs: number;
  currentTurnStartedMainMs: number;
  turnHistory: TurnSnapshot[];
  endedAtMs: number | null;
}

export type GameActionType =
  | "start"
  | "endTurn"
  | "pause"
  | "resume"
  | "undo"
  | "reset"
  | "updateConfig"
  | "skipPlayer"
  | "finish";

export interface GameHistoryEntry {
  label: Exclude<GameActionType, "start" | "undo" | "reset" | "updateConfig">;
  snapshot: UndoSnapshot;
}

export interface GameState extends UndoSnapshot {
  history: GameHistoryEntry[];
}

export type GameAction =
  | { type: "start"; nowPerf: number; nowEpoch: number }
  | { type: "endTurn"; nowPerf: number; nowEpoch: number }
  | { type: "pause"; nowPerf: number; nowEpoch: number }
  | { type: "resume"; nowPerf: number; nowEpoch: number }
  | { type: "undo"; nowPerf: number; nowEpoch: number }
  | { type: "reset" }
  | { type: "updateConfig"; config: AppConfig }
  | { type: "skipPlayer"; nowPerf: number; nowEpoch: number }
  | { type: "finish"; nowPerf: number; nowEpoch: number };

export interface PersistedAppState {
  config: AppConfig;
  presets: SavedPreset[];
  game: GameState;
  appearance?: AppearancePreferences;
}

export interface WakeLockState {
  supported: boolean;
  active: boolean;
  message: string | null;
}
