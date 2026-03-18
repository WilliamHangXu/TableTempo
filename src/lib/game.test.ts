import { describe, expect, it } from "vitest";
import { createDefaultConfig, resizePlayers } from "./presets";
import {
  endTurn,
  pauseGame,
  projectGameState,
  rehydrateGameFromStorage,
  serializeGameForStorage,
  skipActivePlayer,
  startGame
} from "./game";

describe("game timer engine", () => {
  it("spends main time before overtime and never goes negative", () => {
    const config = {
      ...createDefaultConfig(2),
      mainTimeSeconds: 5,
      overtimeSeconds: 10
    };
    const started = startGame(config, 0, 1_000);
    const projected = projectGameState(started, config, 7_000);
    const active = projected.players.find((player) => player.id === projected.activePlayerId);

    expect(active?.remainingMainMs).toBe(0);
    expect(active?.remainingOvertimeMs).toBe(8_000);
    expect(projected.currentTurnElapsedMs).toBe(7_000);
  });

  it("resets overtime when a depleted player becomes active again", () => {
    const config = {
      ...createDefaultConfig(2),
      mainTimeSeconds: 1,
      overtimeSeconds: 5
    };
    const started = startGame(config, 0, 1_000);
    const afterFirstTurn = endTurn(started, config, 1_500, 2_500);
    const afterSecondTurn = endTurn(afterFirstTurn, config, 1_500, 2_500);
    const returnedActive = afterSecondTurn.players.find(
      (player) => player.id === afterSecondTurn.activePlayerId
    );

    expect(returnedActive?.remainingMainMs).toBe(0);
    expect(returnedActive?.remainingOvertimeMs).toBe(5_000);
  });

  it("freezes time while paused", () => {
    const config = {
      ...createDefaultConfig(2),
      mainTimeSeconds: 30,
      overtimeSeconds: 10
    };
    const started = startGame(config, 0, 1_000);
    const paused = pauseGame(started, config, 4_000, 5_000);
    const projected = projectGameState(paused, config, 12_000);
    const active = projected.players.find((player) => player.id === projected.activePlayerId);

    expect(active?.remainingMainMs).toBe(26_000);
    expect(projected.currentTurnElapsedMs).toBe(4_000);
  });

  it("rehydrates a running game from persisted wall clock time", () => {
    const config = {
      ...createDefaultConfig(2),
      mainTimeSeconds: 30,
      overtimeSeconds: 10
    };
    const started = startGame(config, 0, 10_000);
    const persisted = serializeGameForStorage(started, config, 5_000, 15_000);
    const restored = rehydrateGameFromStorage(persisted, config, 10, 21_000);
    const active = restored.players.find((player) => player.id === restored.activePlayerId);

    expect(active?.remainingMainMs).toBe(19_000);
    expect(restored.lastTickAtMs).toBe(10);
  });

  it("eliminates the active player and advances to the next one", () => {
    const config = resizePlayers(createDefaultConfig(4), 3);
    const started = startGame(config, 0, 1_000);
    const skipped = skipActivePlayer(started, config, 2_000, 3_000);
    const eliminated = skipped.players.find((player) => player.name === "Player 1");

    expect(eliminated?.isEliminated).toBe(true);
    expect(skipped.activePlayerId).not.toBe(eliminated?.id);
    expect(skipped.players.filter((player) => !player.isEliminated)).toHaveLength(2);
  });
});
