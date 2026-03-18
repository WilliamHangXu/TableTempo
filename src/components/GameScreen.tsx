import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { AppConfig, GameState, WakeLockState } from "../types";
import { formatClock, formatDuration } from "../lib/time";
import { getActivePlayer, getVisibleClockMs } from "../lib/game";
import { getPlayerTheme } from "../lib/playerTheme";

interface GameScreenProps {
  config: AppConfig;
  game: GameState;
  wakeLock: WakeLockState;
  nowEpoch: number;
  onEndTurn(): void;
  onPauseToggle(): void;
  onUndo(): void;
  onSkipPlayer(): void;
  onReset(): void;
  onFinish(): void;
}

function nextPlayerName(game: GameState): string {
  if (!game.activePlayerId) {
    return "next player";
  }

  const startIndex = game.players.findIndex((player) => player.id === game.activePlayerId);

  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const candidate = game.players[(startIndex + offset) % game.players.length];

    if (!candidate.isEliminated) {
      return candidate.name;
    }
  }

  return "next player";
}

export default function GameScreen({
  config,
  game,
  wakeLock,
  nowEpoch,
  onEndTurn,
  onPauseToggle,
  onUndo,
  onSkipPlayer,
  onReset,
  onFinish
}: GameScreenProps) {
  const activePlayer = getActivePlayer(game);
  const compactLayout = game.players.length > 6;
  const sessionDuration =
    game.startedAtMs === null ? 0 : (game.endedAtMs ?? nowEpoch) - game.startedAtMs;
  const activeClock = activePlayer ? getVisibleClockMs(activePlayer) : 0;
  const inOvertime = Boolean(activePlayer && activePlayer.remainingMainMs === 0);
  const expired = Boolean(
    activePlayer && activePlayer.remainingMainMs === 0 && activePlayer.remainingOvertimeMs === 0
  );
  const activeTheme = getPlayerTheme(activePlayer?.color, expired ? "expired" : "normal");
  const heroStyle: CSSProperties = {
    ["--hero-bg-color" as string]: activeTheme.heroBackgroundColor,
    ["--hero-bg-image" as string]: activeTheme.heroBackgroundImage,
    ["--hero-text-color" as string]: activeTheme.heroTextColor,
    borderColor: activeTheme.accentColor
  };
  const heroMutedTextStyle: CSSProperties = {
    color: activeTheme.heroMutedTextColor
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((event.code === "Space" || event.key === "Enter") && game.phase === "running") {
        event.preventDefault();
        onEndTurn();
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        onPauseToggle();
        return;
      }

      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        onUndo();
        return;
      }

      if (event.key.toLowerCase() === "s" && game.phase === "running") {
        event.preventDefault();
        onSkipPlayer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.phase, onEndTurn, onPauseToggle, onSkipPlayer, onUndo]);

  return (
    <main className="app-shell game-shell">
      <section className="active-hero" style={heroStyle}>
        <div>
          <p className="eyebrow" style={heroMutedTextStyle}>
            {game.phase === "paused" ? "Paused" : `Turn ${game.turnNumber}`}
          </p>
          <h1>{activePlayer?.name ?? "No active player"}</h1>
          <p className="hero-copy" style={heroMutedTextStyle}>
            {expired
              ? "Overtime expired. The table decides what happens next."
              : inOvertime
                ? "Overtime is live for this turn."
                : "Main time bank is running."}
          </p>
        </div>

        <div className="active-clock-block">
          <span className="active-clock-label" style={heroMutedTextStyle}>
            {inOvertime ? "Overtime" : "Main bank"}
          </span>
          <strong>{formatClock(activeClock)}</strong>
          <small style={heroMutedTextStyle}>{formatDuration(sessionDuration)} elapsed in session</small>
        </div>
      </section>

      {wakeLock.message ? <p className="wake-lock-banner">{wakeLock.message}</p> : null}

      <section className="control-bar">
        <button className="primary-action turn-pass" type="button" onClick={onEndTurn} disabled={game.phase !== "running"}>
          Pass to {nextPlayerName(game)}
        </button>
        <button type="button" onClick={onPauseToggle}>
          {game.phase === "paused" ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={onUndo} disabled={game.history.length === 0}>
          Undo
        </button>
        <button type="button" onClick={onSkipPlayer} disabled={game.phase !== "running"}>
          Eliminate active
        </button>
        <button type="button" onClick={onFinish}>
          End session
        </button>
        <button type="button" className="ghost-button" onClick={onReset}>
          Reset to setup
        </button>
      </section>

      <section className={`player-grid ${compactLayout ? "compact" : ""}`}>
        {game.players.map((player) => {
          const playerClock = getVisibleClockMs(player);
          const playerExpired = player.remainingMainMs === 0 && player.remainingOvertimeMs === 0;
          const playerInOvertime = player.remainingMainMs === 0;

          return (
            <article
              className={`player-card ${player.isActive ? "is-active" : ""} ${player.isEliminated ? "is-eliminated" : ""} ${playerExpired && player.isActive ? "is-expired" : ""}`}
              key={player.id}
              style={{ ["--player-accent" as string]: player.color }}
            >
              <div className="player-card-header">
                <div>
                  <span className="player-index">{player.name}</span>
                  <h2>{player.isEliminated ? "Out" : player.isActive ? "Active" : "Waiting"}</h2>
                </div>
                <span className="player-badge">
                  {playerInOvertime ? "OT" : formatClock(player.remainingMainMs)}
                </span>
              </div>

              <div className="player-clock">{formatClock(playerClock)}</div>

              <dl className="player-stats">
                <div>
                  <dt>Main left</dt>
                  <dd>{formatClock(player.remainingMainMs)}</dd>
                </div>
                <div>
                  <dt>Overtime</dt>
                  <dd>{formatClock(player.remainingOvertimeMs)}</dd>
                </div>
                <div>
                  <dt>Total think</dt>
                  <dd>{formatDuration(player.stats.totalTurnMs + (player.isActive ? game.currentTurnElapsedMs : 0))}</dd>
                </div>
                <div>
                  <dt>Longest turn</dt>
                  <dd>{formatDuration(player.stats.longestTurnMs)}</dd>
                </div>
              </dl>

              <p className="status-copy">
                {player.isEliminated
                  ? "Skipped in turn rotation."
                  : playerExpired && player.isActive
                    ? "Timer exhausted. Alert-only mode is active."
                    : playerInOvertime
                      ? `Warnings at ${config.warningSeconds.join(", ")} seconds.`
                      : "Main bank still available."}
              </p>
            </article>
          );
        })}
      </section>

      <footer className="keyboard-hint">
        Space or Enter passes the turn. P pauses. U undoes. S eliminates the active player.
      </footer>
    </main>
  );
}
