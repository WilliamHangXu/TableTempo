import type { PlayerState, TurnSnapshot } from "../types";

export interface EfficientPlayerSummary {
  playerId: string;
  playerName: string;
  averageTurnMs: number;
  overtimeTurns: number;
  completedTurns: number;
}

export function getTotalOvertimeTurns(players: PlayerState[]): number {
  return players.reduce((total, player) => total + player.stats.overtimeTurns, 0);
}

export function getLongestTurn(turnHistory: TurnSnapshot[]): TurnSnapshot | null {
  if (turnHistory.length === 0) {
    return null;
  }

  return turnHistory.reduce((longest, current) =>
    current.durationMs > longest.durationMs ? current : longest
  );
}

export function getMostEfficientPlayer(players: PlayerState[]): EfficientPlayerSummary | null {
  const ranked = players
    .filter((player) => player.stats.completedTurns > 0)
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      averageTurnMs: player.stats.totalTurnMs / player.stats.completedTurns,
      overtimeTurns: player.stats.overtimeTurns,
      completedTurns: player.stats.completedTurns
    }))
    .sort((left, right) => {
      if (left.averageTurnMs !== right.averageTurnMs) {
        return left.averageTurnMs - right.averageTurnMs;
      }

      if (left.overtimeTurns !== right.overtimeTurns) {
        return left.overtimeTurns - right.overtimeTurns;
      }

      if (left.completedTurns !== right.completedTurns) {
        return right.completedTurns - left.completedTurns;
      }

      return left.playerName.localeCompare(right.playerName);
    });

  return ranked[0] ?? null;
}
