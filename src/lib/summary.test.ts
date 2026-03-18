import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./presets";
import { createSetupGame } from "./game";
import { getLongestTurn, getMostEfficientPlayer, getTotalOvertimeTurns } from "./summary";

describe("summary helpers", () => {
  it("picks the most efficient player with the documented tiebreakers", () => {
    const game = createSetupGame(createDefaultConfig(3));
    const [anna, bella, chris] = game.players;

    anna.name = "Anna";
    anna.stats.totalTurnMs = 60_000;
    anna.stats.completedTurns = 2;
    anna.stats.overtimeTurns = 1;

    bella.name = "Bella";
    bella.stats.totalTurnMs = 60_000;
    bella.stats.completedTurns = 2;
    bella.stats.overtimeTurns = 0;

    chris.name = "Chris";
    chris.stats.totalTurnMs = 90_000;
    chris.stats.completedTurns = 3;
    chris.stats.overtimeTurns = 0;

    const efficient = getMostEfficientPlayer(game.players);

    expect(efficient?.playerName).toBe("Chris");
    expect(efficient?.averageTurnMs).toBe(30_000);
  });

  it("finds the longest turn and total overtime turns", () => {
    const game = createSetupGame(createDefaultConfig(2));
    const [first, second] = game.players;

    first.stats.overtimeTurns = 2;
    second.stats.overtimeTurns = 1;
    game.turnHistory = [
      {
        turnNumber: 3,
        playerId: first.id,
        playerName: first.name,
        durationMs: 55_000,
        endedAtEpochMs: 10,
        usedOvertime: false,
        overtimeExpired: false
      },
      {
        turnNumber: 4,
        playerId: second.id,
        playerName: second.name,
        durationMs: 82_000,
        endedAtEpochMs: 20,
        usedOvertime: true,
        overtimeExpired: false
      }
    ];

    expect(getTotalOvertimeTurns(game.players)).toBe(3);
    expect(getLongestTurn(game.turnHistory)?.turnNumber).toBe(4);
  });
});
