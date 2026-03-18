import { useEffect, useRef, useState } from "react";
import GameScreen from "./components/GameScreen";
import SetupScreen from "./components/SetupScreen";
import SummaryScreen from "./components/SummaryScreen";
import { useTicker } from "./hooks/useTicker";
import { useWakeLock } from "./hooks/useWakeLock";
import { triggerAlert } from "./lib/alerts";
import {
  createSetupGame,
  endTurn,
  finishGame,
  getActivePlayer,
  getVisibleClockMs,
  pauseGame,
  projectGameState,
  rehydrateGameFromStorage,
  resetGame,
  resumeGame,
  serializeGameForStorage,
  skipActivePlayer,
  startGame,
  undoLastAction
} from "./lib/game";
import {
  buildBuiltInPresets,
  createDefaultConfig,
  createSavedPreset,
  normalizeConfig,
  resizePlayers
} from "./lib/presets";
import { loadPersistedState, savePersistedState } from "./lib/storage";
import type { AppConfig, GameState, SavedPreset } from "./types";

const BUILT_IN_PRESETS = buildBuiltInPresets();

interface InitialState {
  config: AppConfig;
  presets: SavedPreset[];
  game: GameState;
}

function getInitialState(): InitialState {
  const fallbackConfig = createDefaultConfig(4);
  const persisted = loadPersistedState();

  if (!persisted) {
    return {
      config: fallbackConfig,
      presets: [],
      game: createSetupGame(fallbackConfig)
    };
  }

  const config = normalizeConfig(persisted.config ?? fallbackConfig);
  const presets = Array.isArray(persisted.presets)
    ? persisted.presets.map((preset) => ({
        ...preset,
        config: normalizeConfig(preset.config)
      }))
    : [];
  const game = persisted.game
    ? rehydrateGameFromStorage(persisted.game, config, performance.now(), Date.now())
    : createSetupGame(config);

  return {
    config,
    presets,
    game
  };
}

export default function App() {
  const initialRef = useRef<InitialState | null>(null);

  if (initialRef.current === null) {
    initialRef.current = getInitialState();
  }

  const initial = initialRef.current;
  const [config, setConfig] = useState<AppConfig>(initial.config);
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>(initial.presets);
  const [game, setGame] = useState<GameState>(initial.game);
  const tick = useTicker(game.phase === "running");
  const wakeLock = useWakeLock(game.phase === "running");
  const alertStateRef = useRef({
    playerId: "",
    turnNumber: 0,
    clockMs: Number.POSITIVE_INFINITY,
    expired: false
  });
  const projectedGame = projectGameState(game, config, tick.perf);
  const activePlayer = getActivePlayer(projectedGame);
  const activeClockMs = activePlayer ? getVisibleClockMs(activePlayer) : Number.POSITIVE_INFINITY;
  const activeExpired = Boolean(
    activePlayer && activePlayer.remainingMainMs === 0 && activePlayer.remainingOvertimeMs === 0
  );
  const persistMarker =
    game.phase === "running"
      ? Math.floor(tick.epoch / 1000)
      : `${game.phase}-${game.turnNumber}-${game.history.length}-${customPresets.length}`;

  function updateConfig(nextConfig: AppConfig) {
    const normalized = normalizeConfig(nextConfig);
    setConfig(normalized);
    setGame((current) => (current.phase === "setup" ? createSetupGame(normalized) : current));
  }

  function now() {
    return {
      perf: performance.now(),
      epoch: Date.now()
    };
  }

  useEffect(() => {
    const previous = alertStateRef.current;
    const snapshot = {
      playerId: activePlayer?.id ?? "",
      turnNumber: projectedGame.turnNumber,
      clockMs: activeClockMs,
      expired: activeExpired
    };

    if (projectedGame.phase !== "running" || !activePlayer) {
      alertStateRef.current = snapshot;
      return;
    }

    const sameTurn =
      previous.playerId === snapshot.playerId && previous.turnNumber === snapshot.turnNumber;

    if (sameTurn) {
      const warningThresholds = [...config.warningSeconds]
        .sort((left, right) => right - left)
        .map((value) => value * 1000);

      for (const threshold of warningThresholds) {
        if (previous.clockMs > threshold && snapshot.clockMs <= threshold && snapshot.clockMs > 0) {
          triggerAlert("warning", config.soundEnabled, config.vibrationEnabled);
          break;
        }
      }

      if (!previous.expired && snapshot.expired) {
        triggerAlert("timeout", config.soundEnabled, config.vibrationEnabled);
      }
    }

    alertStateRef.current = snapshot;
  }, [
    activeClockMs,
    activeExpired,
    activePlayer,
    config.soundEnabled,
    config.vibrationEnabled,
    config.warningSeconds,
    projectedGame.phase,
    projectedGame.turnNumber
  ]);

  useEffect(() => {
    const persistGame = serializeGameForStorage(game, config, tick.perf, tick.epoch);
    savePersistedState({
      config,
      presets: customPresets,
      game: persistGame
    });
  }, [config, customPresets, game, persistMarker]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const clock = now();
      savePersistedState({
        config,
        presets: customPresets,
        game: serializeGameForStorage(game, config, clock.perf, clock.epoch)
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [config, customPresets, game]);

  if (projectedGame.phase === "setup") {
    return (
      <SetupScreen
        config={config}
        builtInPresets={BUILT_IN_PRESETS}
        customPresets={customPresets}
        onPlayerCountChange={(count) => updateConfig(resizePlayers(config, count))}
        onPlayerUpdate={(index, patch) => {
          const nextPlayers = config.players.map((player, playerIndex) =>
            playerIndex === index ? { ...player, ...patch } : player
          );
          updateConfig({
            ...config,
            players: nextPlayers
          });
        }}
        onMainTimeChange={(seconds) =>
          updateConfig({
            ...config,
            mainTimeSeconds: seconds
          })
        }
        onOvertimeChange={(seconds) =>
          updateConfig({
            ...config,
            overtimeSeconds: seconds
          })
        }
        onWarningChange={(warnings) =>
          updateConfig({
            ...config,
            warningSeconds: warnings
          })
        }
        onSoundChange={(enabled) =>
          updateConfig({
            ...config,
            soundEnabled: enabled
          })
        }
        onVibrationChange={(enabled) =>
          updateConfig({
            ...config,
            vibrationEnabled: enabled
          })
        }
        onLoadPreset={(preset) => {
          const nextConfig = normalizeConfig(preset.config);
          setConfig(nextConfig);
          setGame(createSetupGame(nextConfig));
        }}
        onSavePreset={(name) => {
          const preset = createSavedPreset(name, config);
          setCustomPresets((current) => [...current, preset]);
        }}
        onDeletePreset={(id) => {
          setCustomPresets((current) => current.filter((preset) => preset.id !== id));
        }}
        onStart={() => {
          const clock = now();
          setGame(startGame(config, clock.perf, clock.epoch));
        }}
      />
    );
  }

  if (projectedGame.phase === "finished") {
    return (
      <SummaryScreen
        config={config}
        game={projectedGame}
        onPlayAgain={() => {
          const clock = now();
          setGame(startGame(config, clock.perf, clock.epoch));
        }}
        onBackToSetup={() => setGame(createSetupGame(config))}
      />
    );
  }

  return (
    <GameScreen
      config={config}
      game={projectedGame}
      wakeLock={wakeLock}
      nowEpoch={tick.epoch}
      onEndTurn={() => {
        const clock = now();
        setGame((current) => endTurn(current, config, clock.perf, clock.epoch));
      }}
      onPauseToggle={() => {
        const clock = now();
        setGame((current) =>
          current.phase === "paused"
            ? resumeGame(current, clock.perf, clock.epoch)
            : pauseGame(current, config, clock.perf, clock.epoch)
        );
      }}
      onUndo={() => {
        const clock = now();
        setGame((current) => undoLastAction(current, clock.perf, clock.epoch));
      }}
      onSkipPlayer={() => {
        const clock = now();
        setGame((current) => skipActivePlayer(current, config, clock.perf, clock.epoch));
      }}
      onFinish={() => {
        const clock = now();
        setGame((current) => finishGame(current, config, clock.perf, clock.epoch));
      }}
      onReset={() => setGame(resetGame(config))}
    />
  );
}
