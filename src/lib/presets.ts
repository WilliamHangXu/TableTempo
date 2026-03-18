import type { AppConfig, SavedPreset } from "../types";
import {
  BUILTIN_PRESET_DEFINITIONS,
  DEFAULT_MAIN_TIME_SECONDS,
  DEFAULT_OVERTIME_SECONDS,
  DEFAULT_PLAYER_COLORS,
  DEFAULT_WARNING_SECONDS,
  MAX_PLAYERS,
  MIN_PLAYERS
} from "./constants";
import { clamp } from "./time";

let nextId = 0;

function createId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId.toString(36)}`;
}

function normalizeWarnings(warnings: number[]): number[] {
  const normalized = warnings
    .map((warning) => Math.round(warning))
    .filter((warning) => warning > 0);

  const unique = [...new Set(normalized)];

  if (unique.length === 0) {
    return [...DEFAULT_WARNING_SECONDS];
  }

  return unique.sort((left, right) => right - left);
}

function makeDefaultPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: createId("player"),
    name: `Player ${index + 1}`,
    color: DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length]
  }));
}


export function normalizeConfig(config: AppConfig): AppConfig {
  const safeCount = clamp(Math.round(config.players.length), MIN_PLAYERS, MAX_PLAYERS);
  const existingPlayers = config.players.slice(0, safeCount).map((player, index) => ({
    id: player.id || createId("player"),
    name: player.name?.trim() || `Player ${index + 1}`,
    color: player.color || DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length]
  }));

  while (existingPlayers.length < safeCount) {
    existingPlayers.push({
      id: createId("player"),
      name: `Player ${existingPlayers.length + 1}`,
      color: DEFAULT_PLAYER_COLORS[existingPlayers.length % DEFAULT_PLAYER_COLORS.length]
    });
  }

  return {
    players: existingPlayers,
    mainTimeSeconds: clamp(Math.round(config.mainTimeSeconds), 0, 60 * 60),
    overtimeSeconds: clamp(Math.round(config.overtimeSeconds), 5, 10 * 60),
    warningSeconds: normalizeWarnings(config.warningSeconds),
    timeoutMode: "alert",
    soundEnabled: Boolean(config.soundEnabled),
    vibrationEnabled: Boolean(config.vibrationEnabled)
  };
}

export function createDefaultConfig(playerCount = 4): AppConfig {
  return normalizeConfig({
    players: makeDefaultPlayers(playerCount),
    mainTimeSeconds: DEFAULT_MAIN_TIME_SECONDS,
    overtimeSeconds: DEFAULT_OVERTIME_SECONDS,
    warningSeconds: DEFAULT_WARNING_SECONDS,
    timeoutMode: "alert",
    soundEnabled: true,
    vibrationEnabled: true
  });
}

export function buildBuiltInPresets(): SavedPreset[] {
  return BUILTIN_PRESET_DEFINITIONS.map((preset) => ({
    id: preset.id,
    name: preset.name,
    config: normalizeConfig({
      ...createDefaultConfig(4),
      mainTimeSeconds: preset.mainTimeSeconds,
      overtimeSeconds: preset.overtimeSeconds
    })
  }));
}

export function resizePlayers(config: AppConfig, playerCount: number): AppConfig {
  const safeCount = clamp(Math.round(playerCount), MIN_PLAYERS, MAX_PLAYERS);
  const nextPlayers = config.players.slice(0, safeCount).map((player, index) => ({
    ...player,
    id: player.id || createId("player"),
    name: player.name || `Player ${index + 1}`,
    color: player.color || DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length]
  }));

  while (nextPlayers.length < safeCount) {
    nextPlayers.push({
      id: createId("player"),
      name: `Player ${nextPlayers.length + 1}`,
      color: DEFAULT_PLAYER_COLORS[nextPlayers.length % DEFAULT_PLAYER_COLORS.length]
    });
  }

  return normalizeConfig({
    ...config,
    players: nextPlayers
  });
}

export function createSavedPreset(name: string, config: AppConfig): SavedPreset {
  return {
    id: createId("preset"),
    name: name.trim(),
    config: normalizeConfig(config)
  };
}
