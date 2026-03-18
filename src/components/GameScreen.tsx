import { useEffect } from "react";
import type { CSSProperties } from "react";
import { getActivePlayer, getVisibleClockMs } from "../lib/game";
import { getPlayerTheme } from "../lib/playerTheme";
import { formatClock, formatSessionClock } from "../lib/time";
import type {
  AppConfig,
  GameState,
  ResolvedTheme,
  ThemePreference,
  WakeLockState
} from "../types";
import ThemeToggle from "./ThemeToggle";

interface GameScreenProps {
  config: AppConfig;
  game: GameState;
  resolvedTheme: ResolvedTheme;
  themePreference: ThemePreference;
  wakeLock: WakeLockState;
  nowEpoch: number;
  onThemePreferenceChange(value: ThemePreference): void;
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

function getRoundNumber(game: GameState): number {
  const activePlayer = getActivePlayer(game);

  if (activePlayer) {
    return activePlayer.stats.completedTurns + 1;
  }

  return Math.max(1, ...game.players.map((player) => player.stats.completedTurns));
}

function getStateLabel(
  isActive: boolean,
  isEliminated: boolean,
  inOvertime: boolean,
  expired: boolean
): string {
  if (isEliminated) {
    return "Out";
  }

  if (expired && isActive) {
    return "Timeout";
  }

  if (inOvertime) {
    return "Overtime";
  }

  return isActive ? "Active" : "Waiting";
}

function getClockSubtitle(isEliminated: boolean, inOvertime: boolean): string {
  if (isEliminated) {
    return "out of rotation";
  }

  return inOvertime ? "per-turn clock" : "main bank";
}

export default function GameScreen({
  config,
  game,
  resolvedTheme,
  themePreference,
  wakeLock,
  nowEpoch,
  onThemePreferenceChange,
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
  const activeTheme = getPlayerTheme(
    activePlayer?.color,
    resolvedTheme,
    expired ? "expired" : inOvertime ? "overtime" : "normal"
  );
  const activeClockMax = inOvertime ? config.overtimeSeconds * 1000 : config.mainTimeSeconds * 1000;
  const progressRatio =
    activeClockMax > 0 ? Math.max(0, Math.min(1, activeClock / activeClockMax)) : 0;
  const activeStyle: CSSProperties = {
    ["--accent-color" as string]: activeTheme.accentColor,
    ["--accent-tint" as string]: activeTheme.accentTint,
    ["--accent-tint-strong" as string]: activeTheme.accentTintStrong,
    ["--accent-text" as string]: activeTheme.accentTextColor,
    ["--accent-rail" as string]: activeTheme.railColor,
    ["--accent-rail-track" as string]: activeTheme.railTrackColor,
    ["--accent-border" as string]: activeTheme.borderColor,
    ["--progress-ratio" as string]: `${progressRatio}`
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
    <main className="app-shell page-shell game-page">
      <header className="screen-masthead game-masthead">
        <div className="masthead-copy">
          <p className="brand-line">
            <span className="brand-name">Table Tempo</span>
          </p>
          <div className="pill-strip">
            <span className="utility-chip">Round {getRoundNumber(game)}</span>
            <span className="utility-chip">Turn {game.turnNumber}</span>
            <span className="utility-chip">{formatSessionClock(sessionDuration)} elapsed</span>
          </div>
        </div>

        <div className="masthead-tools game-tools">
          <ThemeToggle value={themePreference} onChange={onThemePreferenceChange} />
        </div>
      </header>

      <section className="game-layout">
        <div className="game-main-column">
          <section
            className={`panel active-clock-card ${game.phase === "paused" ? "is-paused" : ""} ${inOvertime ? "is-overtime" : ""} ${expired ? "is-expired" : ""}`}
            style={activeStyle}
          >
            <div className="active-card-header">
              <p className="section-kicker">{game.phase === "paused" ? "Paused" : "Thinking now"}</p>
            </div>

            <div className="active-player-line">
              <span className={`active-player-dot ${game.phase === "running" ? "is-running" : ""}`} />
              <h1>{activePlayer?.name ?? "No active player"}</h1>
            </div>

            <div className="active-mono">{formatClock(activeClock)}</div>

            <div className="active-progress-meta">
              <span>{formatClock(activeClock)} remaining</span>
              <span>
                {formatClock(activeClockMax)} {inOvertime ? "per-turn clock" : "main bank"}
              </span>
            </div>

            <div className="active-progress-rail">
              <div
                className={`active-progress-fill ${game.phase === "running" ? "is-running" : ""} ${inOvertime ? "is-overtime" : ""}`}
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>

            <p className="active-status-copy">
              {expired
                ? "Overtime expired. Table Tempo stays in alert-only mode and lets the table decide the consequence."
                : inOvertime
                  ? "This player is on their per-turn overtime window. Pass quickly to keep the table moving."
                  : "Main bank is still available for this player. Warnings will trigger at the configured thresholds."}
            </p>

            <button
              className="pass-turn-button"
              type="button"
              onClick={onEndTurn}
              disabled={game.phase !== "running"}
              style={activeStyle}
            >
              Pass turn to {nextPlayerName(game)}
            </button>
          </section>

          <section className={`player-grid ${compactLayout ? "compact" : ""}`}>
            {game.players.map((player) => {
              const playerClock = getVisibleClockMs(player);
              const playerExpired =
                player.remainingMainMs === 0 && player.remainingOvertimeMs === 0;
              const playerInOvertime = player.remainingMainMs === 0;
              const averageTurnMs =
                player.stats.completedTurns > 0
                  ? player.stats.totalTurnMs / player.stats.completedTurns
                  : 0;
              const playerTheme = getPlayerTheme(
                player.color,
                resolvedTheme,
                playerExpired && player.isActive ? "expired" : playerInOvertime ? "overtime" : "normal"
              );
              const playerStyle: CSSProperties = {
                ["--accent-color" as string]: playerTheme.accentColor,
                ["--accent-tint" as string]: playerTheme.accentTint,
                ["--accent-tint-strong" as string]: playerTheme.accentTintStrong,
                ["--accent-text" as string]: playerTheme.accentTextColor,
                ["--accent-border" as string]: playerTheme.borderColor
              };

              return (
                <article
                  className={`panel player-tile ${player.isActive ? "is-active" : ""} ${player.isEliminated ? "is-eliminated" : ""}`}
                  key={player.id}
                  style={playerStyle}
                >
                  <div className="player-tile-header">
                    <div className="player-tile-name">
                      <span className="player-tile-dot" />
                      <h2>{player.name}</h2>
                    </div>
                    <span className="state-pill">
                      {getStateLabel(
                        player.isActive,
                        player.isEliminated,
                        playerInOvertime,
                        playerExpired
                      )}
                    </span>
                  </div>

                  <div className="player-tile-clock">{formatClock(playerClock)}</div>
                  <p className="player-tile-subcopy">
                    {getClockSubtitle(player.isEliminated, playerInOvertime)}
                  </p>

                  <dl className="player-tile-stats">
                    <div>
                      <dt>Turns</dt>
                      <dd>{player.stats.completedTurns}</dd>
                    </div>
                    <div>
                      <dt>Longest</dt>
                      <dd>{formatClock(player.stats.longestTurnMs)}</dd>
                    </div>
                    <div>
                      <dt>Avg / turn</dt>
                      <dd>{player.stats.completedTurns > 0 ? formatClock(averageTurnMs) : "—"}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>
        </div>

        <aside className="panel side-utility-panel">
          <div className="side-panel-section">
            <p className="section-kicker">Device</p>
            <p className="device-note">
              {wakeLock.message ??
                (wakeLock.active
                  ? "Wake Lock is active for this session."
                  : "Wake Lock is available when the browser grants it.")}
            </p>
          </div>

          <div className="side-panel-section">
            <p className="section-kicker">Keyboard</p>
            <div className="shortcut-list">
              <div className="shortcut-row">
                <span>Pass</span>
                <kbd>Space</kbd>
              </div>
              <div className="shortcut-row">
                <span>Pause</span>
                <kbd>P</kbd>
              </div>
              <div className="shortcut-row">
                <span>Undo</span>
                <kbd>U</kbd>
              </div>
              <div className="shortcut-row">
                <span>Eliminate</span>
                <kbd>S</kbd>
              </div>
            </div>
          </div>

          <div className="side-action-column">
            <button type="button" onClick={onSkipPlayer} disabled={game.phase !== "running"}>
              Eliminate active
            </button>
            <button type="button" onClick={onPauseToggle}>
              {game.phase === "paused" ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={onUndo} disabled={game.history.length === 0}>
              Undo
            </button>
            <button type="button" className="danger-button" onClick={onFinish}>
              End session
            </button>
            <button type="button" className="ghost-button" onClick={onReset}>
              Reset to setup
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
