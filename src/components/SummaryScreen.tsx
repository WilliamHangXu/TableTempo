import type { CSSProperties } from "react";
import { getPlayerTheme } from "../lib/playerTheme";
import { getLongestTurn, getMostEfficientPlayer, getTotalOvertimeTurns } from "../lib/summary";
import { formatClock, formatSessionClock } from "../lib/time";
import type { AppConfig, GameState, ResolvedTheme, ThemePreference } from "../types";
import ThemeToggle from "./ThemeToggle";

interface SummaryScreenProps {
  config: AppConfig;
  game: GameState;
  resolvedTheme: ResolvedTheme;
  themePreference: ThemePreference;
  onThemePreferenceChange(value: ThemePreference): void;
  onPlayAgain(): void;
  onBackToSetup(): void;
}

export default function SummaryScreen({
  config,
  game,
  resolvedTheme,
  themePreference,
  onThemePreferenceChange,
  onPlayAgain,
  onBackToSetup
}: SummaryScreenProps) {
  const sessionDuration =
    game.startedAtMs && game.endedAtMs ? game.endedAtMs - game.startedAtMs : 0;
  const recentTurns = game.turnHistory.slice(-10).reverse();
  const totalOvertimeTurns = getTotalOvertimeTurns(game.players);
  const longestTurn = getLongestTurn(game.turnHistory);
  const efficientPlayer = getMostEfficientPlayer(game.players);
  const maxTotalThinkMs = Math.max(1, ...game.players.map((player) => player.stats.totalTurnMs));
  const playersById = new Map(game.players.map((player) => [player.id, player]));

  return (
    <main className="app-shell page-shell summary-page">
      <header className="screen-masthead summary-masthead">
        <div className="masthead-copy">
          <p className="brand-line">
            <span className="brand-name">Session summary</span>
          </p>
          <p className="screen-copy">
            {config.players.length} players · {formatSessionClock(sessionDuration)} total table time.
          </p>
        </div>

        <div className="masthead-tools">
          <ThemeToggle value={themePreference} onChange={onThemePreferenceChange} />
          <div className="utility-action-row">
            <button type="button" onClick={onBackToSetup}>
              Back to setup
            </button>
            <button type="button" className="primary-action" onClick={onPlayAgain}>
              New game
            </button>
          </div>
        </div>
      </header>

      <section className="headline-grid">
        <article className="panel headline-stat">
          <p className="section-kicker">Total time</p>
          <strong>{formatSessionClock(sessionDuration)}</strong>
          <span>whole session</span>
        </article>
        <article className="panel headline-stat">
          <p className="section-kicker">Turns played</p>
          <strong>{game.turnHistory.length}</strong>
          <span>{Math.round(game.turnHistory.length / Math.max(1, config.players.length))} avg per player</span>
        </article>
        <article className="panel headline-stat">
          <p className="section-kicker">Overtime turns</p>
          <strong>{totalOvertimeTurns}</strong>
          <span>alert-only mode</span>
        </article>
        <article className="panel headline-stat">
          <p className="section-kicker">Longest turn</p>
          <strong>{longestTurn ? formatClock(longestTurn.durationMs) : "0:00"}</strong>
          <span>
            {longestTurn ? `${longestTurn.playerName}, turn ${longestTurn.turnNumber}` : "No turns recorded"}
          </span>
        </article>
      </section>

      <section className="panel highlight-callout">
        {efficientPlayer ? (
          <p>
            <strong>Most efficient player</strong> — {efficientPlayer.playerName} with {formatClock(efficientPlayer.averageTurnMs)} average turn time and {efficientPlayer.overtimeTurns === 0 ? "no overtime used" : `${efficientPlayer.overtimeTurns} overtime turn${efficientPlayer.overtimeTurns === 1 ? "" : "s"}`}
          </p>
        ) : (
          <p>No completed turns were recorded in this session.</p>
        )}
      </section>

      <section className="panel scorecard-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Player breakdown</p>
            <h2>Score sheet</h2>
          </div>
        </div>

        <div className="score-table-wrap">
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">Player</th>
                <th scope="col">Total think time</th>
                <th scope="col">Avg / turn</th>
                <th scope="col">Longest turn</th>
                <th scope="col">OT turns</th>
                <th scope="col">Bank remaining</th>
              </tr>
            </thead>
            <tbody>
              {game.players.map((player) => {
                const accentTheme = getPlayerTheme(
                  player.color,
                  resolvedTheme,
                  player.stats.timeouts > 0 ? "overtime" : "normal"
                );
                const totalThinkRatio = player.stats.totalTurnMs / maxTotalThinkMs;
                const averageTurnMs =
                  player.stats.completedTurns > 0
                    ? player.stats.totalTurnMs / player.stats.completedTurns
                    : 0;
                const rowStyle: CSSProperties = {
                  ["--accent-color" as string]: accentTheme.accentColor,
                  ["--accent-tint" as string]: accentTheme.accentTint,
                  ["--accent-border" as string]: accentTheme.borderColor
                };

                return (
                  <tr key={player.id} style={rowStyle}>
                    <th scope="row" data-label="Player">
                      <div className="score-player-cell">
                        <span className="score-player-dot" />
                        <span>{player.name}</span>
                        {player.stats.timeouts > 0 ? (
                          <span className="score-timeout-pill">TO {player.stats.timeouts}</span>
                        ) : null}
                      </div>
                    </th>
                    <td data-label="Total think time">
                      <div className="score-bar-cell">
                        <span className="score-bar-track">
                          <span
                            className="score-bar-fill"
                            style={{ width: `${Math.max(10, totalThinkRatio * 100)}%` }}
                          />
                        </span>
                        <span>{formatSessionClock(player.stats.totalTurnMs)}</span>
                      </div>
                    </td>
                    <td data-label="Avg / turn">
                      {player.stats.completedTurns > 0 ? formatClock(averageTurnMs) : "—"}
                    </td>
                    <td data-label="Longest turn">{formatClock(player.stats.longestTurnMs)}</td>
                    <td data-label="OT turns">
                      {player.stats.overtimeTurns > 0 ? (
                        <span className="score-overtime-pill">×{player.stats.overtimeTurns}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Bank remaining">
                      {player.remainingMainMs > 0 ? formatClock(player.remainingMainMs) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel recent-turns-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Recent turns</p>
            <h2>Latest stretch</h2>
          </div>
        </div>

        <div className="recent-turn-chip-row">
          {recentTurns.length > 0 ? (
            recentTurns.map((turn) => {
              const player = playersById.get(turn.playerId);
              const chipTheme = getPlayerTheme(
                player?.color,
                resolvedTheme,
                turn.overtimeExpired ? "expired" : turn.usedOvertime ? "overtime" : "normal"
              );
              const chipStyle: CSSProperties = {
                ["--accent-color" as string]: chipTheme.accentColor,
                ["--accent-tint" as string]: chipTheme.accentTint,
                ["--accent-border" as string]: chipTheme.borderColor,
                ["--accent-text" as string]: chipTheme.accentTextColor
              };

              return (
                <span
                  key={`${turn.playerId}-${turn.turnNumber}-${turn.endedAtEpochMs}`}
                  className={`recent-turn-chip ${turn.overtimeExpired ? "is-timeout" : turn.usedOvertime ? "is-overtime" : ""}`}
                  style={chipStyle}
                  title={turn.overtimeExpired ? `${turn.playerName} timed out on turn ${turn.turnNumber}` : turn.usedOvertime ? `${turn.playerName} used overtime on turn ${turn.turnNumber}` : `${turn.playerName} stayed in main bank on turn ${turn.turnNumber}`}
                >
                  {turn.playerName.charAt(0).toUpperCase()} {formatClock(turn.durationMs)}
                </span>
              );
            })
          ) : (
            <p className="muted-copy">No completed turns were logged in this session.</p>
          )}
        </div>
      </section>
    </main>
  );
}
