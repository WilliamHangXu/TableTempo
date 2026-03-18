import type { AppConfig, GameState } from "../types";
import { formatDuration } from "../lib/time";

interface SummaryScreenProps {
  config: AppConfig;
  game: GameState;
  onPlayAgain(): void;
  onBackToSetup(): void;
}

export default function SummaryScreen({
  config,
  game,
  onPlayAgain,
  onBackToSetup
}: SummaryScreenProps) {
  const sessionDuration =
    game.startedAtMs && game.endedAtMs ? game.endedAtMs - game.startedAtMs : 0;
  const recentTurns = game.turnHistory.slice(-6).reverse();

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Session complete</p>
          <h1>Round summary</h1>
          <p className="hero-copy">
            {config.players.length} players, {formatDuration(sessionDuration)} total table time.
          </p>
        </div>

        <div className="hero-metrics">
          <article className="metric-card">
            <span>Turns logged</span>
            <strong>{game.turnHistory.length}</strong>
          </article>
          <article className="metric-card">
            <span>Warnings mode</span>
            <strong>{config.warningSeconds.join(" / ")}s</strong>
          </article>
          <article className="metric-card">
            <span>Overtime</span>
            <strong>{config.overtimeSeconds}s</strong>
          </article>
        </div>
      </section>

      <section className="summary-grid">
        {game.players.map((player) => (
          <article
            className={`summary-player-card ${player.isEliminated ? "is-eliminated" : ""}`}
            key={player.id}
            style={{ ["--summary-accent" as string]: player.color }}
          >
            <div className="summary-player-head">
              <div className="summary-player-identity">
                <p className="summary-player-name">{player.name}</p>
                <p className="summary-player-status">
                  {player.isEliminated ? "Eliminated" : "Finished in rotation"} ·{" "}
                  {player.stats.completedTurns} turns
                </p>
              </div>
              <div className="summary-timeouts">
                <span>Timeouts</span>
                <strong>{player.stats.timeouts}</strong>
              </div>
            </div>

            <div className="summary-player-total">
              <span>Total think time</span>
              <strong>{formatDuration(player.stats.totalTurnMs)}</strong>
            </div>

            <dl className="summary-player-metrics">
              <div>
                <dt>Longest turn</dt>
                <dd>{formatDuration(player.stats.longestTurnMs)}</dd>
              </div>
              <div>
                <dt>Overtime turns</dt>
                <dd>{player.stats.overtimeTurns}</dd>
              </div>
              <div>
                <dt>Main remaining</dt>
                <dd>{formatDuration(player.remainingMainMs)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="panel summary-activity-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Latest turns</p>
            <h2>Recent activity</h2>
          </div>
        </div>

        <div className="summary-activity-list">
          {recentTurns.length > 0 ? (
            recentTurns.map((turn) => (
              <article
                className="summary-activity-row"
                key={`${turn.playerId}-${turn.turnNumber}-${turn.endedAtEpochMs}`}
              >
                <div className="summary-activity-main">
                  <div className="summary-activity-identity">
                    <strong>{turn.playerName}</strong>
                    <span>Turn {turn.turnNumber}</span>
                  </div>
                  <strong className="summary-activity-duration">
                    {formatDuration(turn.durationMs)}
                  </strong>
                </div>
                <div className="summary-activity-meta">
                  <span>{turn.usedOvertime ? "Used overtime" : "Main time only"}</span>
                  <span
                    className={`summary-activity-status ${turn.overtimeExpired ? "is-timeout" : ""}`}
                  >
                    {turn.overtimeExpired ? "Timeout" : "Completed cleanly"}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="muted-copy">No completed turns were logged in this session.</p>
          )}
        </div>
      </section>

      <section className="launch-row">
        <button className="primary-action" type="button" onClick={onPlayAgain}>
          Play again
        </button>
        <button type="button" onClick={onBackToSetup}>
          Back to setup
        </button>
      </section>
    </main>
  );
}
