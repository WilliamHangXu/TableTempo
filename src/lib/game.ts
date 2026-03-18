import type {
  AppConfig,
  GameHistoryEntry,
  GameState,
  PlayerState,
  TurnSnapshot,
  UndoSnapshot
} from "../types";
import { MAX_PLAYERS, MIN_PLAYERS } from "./constants";
import { normalizeConfig } from "./presets";
import { clamp } from "./time";

const MAX_HISTORY = 48;

function cloneGame(game: GameState): GameState {
  return structuredClone(game);
}

function toUndoSnapshot(game: GameState): UndoSnapshot {
  const { history: _history, ...snapshot } = game;
  return structuredClone(snapshot);
}

function pushHistory(game: GameState, label: GameHistoryEntry["label"]): GameState {
  const next = cloneGame(game);
  const entry: GameHistoryEntry = {
    label,
    snapshot: toUndoSnapshot(game)
  };

  next.history = [...next.history.slice(-(MAX_HISTORY - 1)), entry];
  return next;
}

function buildPlayerState(config: AppConfig): PlayerState[] {
  return config.players.map((player) => ({
    ...player,
    remainingMainMs: config.mainTimeSeconds * 1000,
    remainingOvertimeMs: config.overtimeSeconds * 1000,
    isActive: false,
    isEliminated: false,
    stats: {
      totalTurnMs: 0,
      longestTurnMs: 0,
      completedTurns: 0,
      overtimeTurns: 0,
      timeouts: 0
    }
  }));
}

function markActivePlayers(players: PlayerState[], activePlayerId: string | null): PlayerState[] {
  return players.map((player) => ({
    ...player,
    isActive: player.id === activePlayerId
  }));
}

function getActivePlayerIndex(game: GameState): number {
  return game.players.findIndex((player) => player.id === game.activePlayerId);
}

function getRemainingPlayers(players: PlayerState[]): PlayerState[] {
  return players.filter((player) => !player.isEliminated);
}

function activatePlayer(
  game: GameState,
  config: AppConfig,
  playerId: string | null,
  nowPerf: number
): GameState {
  const next = cloneGame(game);
  next.activePlayerId = playerId;
  next.players = markActivePlayers(next.players, playerId);
  next.lastTickAtMs = playerId ? nowPerf : null;
  next.persistedAtEpochMs = null;

  if (!playerId) {
    next.currentTurnElapsedMs = 0;
    next.currentTurnStartedMainMs = 0;
    return next;
  }

  const player = next.players.find((entry) => entry.id === playerId);

  if (!player) {
    next.activePlayerId = null;
    next.players = markActivePlayers(next.players, null);
    next.currentTurnElapsedMs = 0;
    next.currentTurnStartedMainMs = 0;
    next.lastTickAtMs = null;
    return next;
  }

  if (player.remainingMainMs <= 0) {
    player.remainingOvertimeMs = config.overtimeSeconds * 1000;
  }

  next.currentTurnElapsedMs = 0;
  next.currentTurnStartedMainMs = player.remainingMainMs;
  return next;
}

function getNextActivePlayerId(players: PlayerState[], currentPlayerId: string | null): string | null {
  const alive = getRemainingPlayers(players);

  if (alive.length === 0) {
    return null;
  }

  if (!currentPlayerId) {
    return alive[0].id;
  }

  const startIndex = players.findIndex((player) => player.id === currentPlayerId);

  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = players[(startIndex + offset) % players.length];

    if (!candidate.isEliminated) {
      return candidate.id;
    }
  }

  return alive[0].id;
}

function currentElapsed(game: GameState, nowPerf: number): number {
  if (game.phase !== "running" || game.lastTickAtMs === null) {
    return 0;
  }

  return Math.max(0, nowPerf - game.lastTickAtMs);
}

function applyElapsedInternal(game: GameState, elapsedMs: number): GameState {
  if (game.phase !== "running" || !game.activePlayerId || elapsedMs <= 0) {
    return cloneGame(game);
  }

  const next = cloneGame(game);
  const playerIndex = getActivePlayerIndex(next);

  if (playerIndex === -1) {
    return next;
  }

  const player = next.players[playerIndex];
  let remaining = elapsedMs;

  if (player.remainingMainMs > 0) {
    const spentMain = Math.min(remaining, player.remainingMainMs);
    player.remainingMainMs -= spentMain;
    remaining -= spentMain;
  }

  if (remaining > 0 && player.remainingOvertimeMs > 0) {
    const spentOvertime = Math.min(remaining, player.remainingOvertimeMs);
    player.remainingOvertimeMs -= spentOvertime;
  }

  player.remainingMainMs = Math.max(0, player.remainingMainMs);
  player.remainingOvertimeMs = Math.max(0, player.remainingOvertimeMs);
  next.currentTurnElapsedMs += elapsedMs;
  next.lastTickAtMs = (next.lastTickAtMs ?? 0) + elapsedMs;

  return next;
}

function recordCompletedTurn(game: GameState, nowEpoch: number, eliminateActive: boolean): GameState {
  if (!game.activePlayerId) {
    return cloneGame(game);
  }

  const next = cloneGame(game);
  const playerIndex = getActivePlayerIndex(next);

  if (playerIndex === -1) {
    return next;
  }

  const player = next.players[playerIndex];
  const durationMs = next.currentTurnElapsedMs;
  const usedOvertime =
    next.currentTurnStartedMainMs <= 0 || durationMs > next.currentTurnStartedMainMs;
  const overtimeExpired = player.remainingMainMs === 0 && player.remainingOvertimeMs === 0;

  player.stats.totalTurnMs += durationMs;
  player.stats.longestTurnMs = Math.max(player.stats.longestTurnMs, durationMs);
  player.stats.completedTurns += 1;
  player.stats.overtimeTurns += usedOvertime ? 1 : 0;
  player.stats.timeouts += overtimeExpired ? 1 : 0;

  const snapshot: TurnSnapshot = {
    turnNumber: next.turnNumber,
    playerId: player.id,
    playerName: player.name,
    durationMs,
    endedAtEpochMs: nowEpoch,
    usedOvertime,
    overtimeExpired
  };

  next.turnHistory = [...next.turnHistory, snapshot];
  player.isActive = false;

  if (eliminateActive) {
    player.isEliminated = true;
  }

  return next;
}

function finishState(game: GameState, nowEpoch: number): GameState {
  const next = cloneGame(game);
  next.phase = "finished";
  next.activePlayerId = null;
  next.players = markActivePlayers(next.players, null);
  next.lastTickAtMs = null;
  next.persistedAtEpochMs = nowEpoch;
  next.endedAtMs = nowEpoch;
  next.currentTurnElapsedMs = 0;
  next.currentTurnStartedMainMs = 0;
  return next;
}

export function createSetupGame(config: AppConfig): GameState {
  const normalized = normalizeConfig(config);

  return {
    phase: "setup",
    activePlayerId: null,
    players: buildPlayerState(normalized),
    turnNumber: 0,
    startedAtMs: null,
    lastTickAtMs: null,
    persistedAtEpochMs: null,
    currentTurnElapsedMs: 0,
    currentTurnStartedMainMs: 0,
    history: [],
    turnHistory: [],
    endedAtMs: null
  };
}

export function startGame(config: AppConfig, nowPerf: number, nowEpoch: number): GameState {
  const normalized = normalizeConfig(config);
  const base = createSetupGame(normalized);
  const firstPlayerId = getNextActivePlayerId(base.players, null);
  const activated = activatePlayer(
    {
      ...base,
      phase: "running",
      startedAtMs: nowEpoch,
      turnNumber: 1,
      persistedAtEpochMs: nowEpoch
    },
    normalized,
    firstPlayerId,
    nowPerf
  );

  return activated;
}

export function projectGameState(game: GameState, config: AppConfig, nowPerf: number): GameState {
  return applyElapsedInternal(game, currentElapsed(game, nowPerf));
}

export function serializeGameForStorage(
  game: GameState,
  config: AppConfig,
  nowPerf: number,
  nowEpoch: number
): GameState {
  const projected = projectGameState(game, config, nowPerf);
  const next = cloneGame(projected);
  next.persistedAtEpochMs = nowEpoch;
  next.lastTickAtMs = null;
  return next;
}

export function rehydrateGameFromStorage(
  game: GameState,
  config: AppConfig,
  nowPerf: number,
  nowEpoch: number
): GameState {
  const normalizedConfig = normalizeConfig(config);
  const base = cloneGame(game);
  const safePlayers = clamp(base.players.length, MIN_PLAYERS, MAX_PLAYERS);

  if (safePlayers !== normalizedConfig.players.length) {
    return createSetupGame(normalizedConfig);
  }

  if (base.phase === "running") {
    const elapsedSincePersist = Math.max(0, nowEpoch - (base.persistedAtEpochMs ?? nowEpoch));
    const advanced = applyElapsedInternal(base, elapsedSincePersist);
    advanced.lastTickAtMs = nowPerf;
    advanced.persistedAtEpochMs = nowEpoch;
    return advanced;
  }

  base.lastTickAtMs = base.phase === "paused" ? null : nowPerf;
  base.persistedAtEpochMs = nowEpoch;
  return base;
}

export function endTurn(
  game: GameState,
  config: AppConfig,
  nowPerf: number,
  nowEpoch: number
): GameState {
  if (game.phase !== "running" || !game.activePlayerId) {
    return cloneGame(game);
  }

  const normalized = normalizeConfig(config);
  const elapsedApplied = applyElapsedInternal(game, currentElapsed(game, nowPerf));
  const undoable = pushHistory(elapsedApplied, "endTurn");
  const recorded = recordCompletedTurn(undoable, nowEpoch, false);
  const nextPlayerId = getNextActivePlayerId(recorded.players, game.activePlayerId);

  if (!nextPlayerId) {
    return finishState(recorded, nowEpoch);
  }

  const next = activatePlayer(
    {
      ...recorded,
      turnNumber: recorded.turnNumber + 1,
      phase: "running"
    },
    normalized,
    nextPlayerId,
    nowPerf
  );

  next.persistedAtEpochMs = nowEpoch;
  return next;
}

export function pauseGame(
  game: GameState,
  config: AppConfig,
  nowPerf: number,
  nowEpoch: number
): GameState {
  if (game.phase !== "running") {
    return cloneGame(game);
  }

  const elapsedApplied = applyElapsedInternal(game, currentElapsed(game, nowPerf));
  const undoable = pushHistory(elapsedApplied, "pause");
  undoable.phase = "paused";
  undoable.lastTickAtMs = null;
  undoable.persistedAtEpochMs = nowEpoch;
  return undoable;
}

export function resumeGame(game: GameState, nowPerf: number, nowEpoch: number): GameState {
  if (game.phase !== "paused") {
    return cloneGame(game);
  }

  const undoable = pushHistory(game, "resume");
  undoable.phase = "running";
  undoable.lastTickAtMs = nowPerf;
  undoable.persistedAtEpochMs = nowEpoch;
  return undoable;
}

export function undoLastAction(game: GameState, nowPerf: number, nowEpoch: number): GameState {
  const lastEntry = game.history[game.history.length - 1];

  if (!lastEntry) {
    return cloneGame(game);
  }

  const restored: GameState = {
    ...structuredClone(lastEntry.snapshot),
    history: structuredClone(game.history.slice(0, -1))
  };

  if (restored.phase === "running") {
    restored.lastTickAtMs = nowPerf;
  } else {
    restored.lastTickAtMs = null;
  }

  restored.persistedAtEpochMs = nowEpoch;
  return restored;
}

export function skipActivePlayer(
  game: GameState,
  config: AppConfig,
  nowPerf: number,
  nowEpoch: number
): GameState {
  if (game.phase !== "running" || !game.activePlayerId) {
    return cloneGame(game);
  }

  const normalized = normalizeConfig(config);
  const elapsedApplied = applyElapsedInternal(game, currentElapsed(game, nowPerf));
  const undoable = pushHistory(elapsedApplied, "skipPlayer");
  const recorded = recordCompletedTurn(undoable, nowEpoch, true);

  if (getRemainingPlayers(recorded.players).length <= 1) {
    return finishState(recorded, nowEpoch);
  }

  const nextPlayerId = getNextActivePlayerId(recorded.players, game.activePlayerId);

  if (!nextPlayerId) {
    return finishState(recorded, nowEpoch);
  }

  const next = activatePlayer(
    {
      ...recorded,
      turnNumber: recorded.turnNumber + 1,
      phase: "running"
    },
    normalized,
    nextPlayerId,
    nowPerf
  );

  next.persistedAtEpochMs = nowEpoch;
  return next;
}

export function finishGame(
  game: GameState,
  config: AppConfig,
  nowPerf: number,
  nowEpoch: number
): GameState {
  if (game.phase === "finished") {
    return cloneGame(game);
  }

  if (game.phase === "setup") {
    return finishState(game, nowEpoch);
  }

  const normalized = normalizeConfig(config);
  const advanced =
    game.phase === "running" ? applyElapsedInternal(game, currentElapsed(game, nowPerf)) : cloneGame(game);
  const undoable = pushHistory(advanced, "finish");
  const finalized =
    undoable.activePlayerId && undoable.currentTurnElapsedMs > 0
      ? recordCompletedTurn(undoable, nowEpoch, false)
      : cloneGame(undoable);

  return finishState(finalized, nowEpoch);
}

export function resetGame(config: AppConfig): GameState {
  return createSetupGame(config);
}

export function getActivePlayer(game: GameState): PlayerState | null {
  return game.players.find((player) => player.id === game.activePlayerId) ?? null;
}

export function getVisibleClockMs(player: PlayerState): number {
  if (player.remainingMainMs > 0) {
    return player.remainingMainMs;
  }

  return player.remainingOvertimeMs;
}
