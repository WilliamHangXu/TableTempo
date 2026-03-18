import { useEffect, useState } from "react";
import type { AppConfig, PlayerConfig, SavedPreset } from "../types";
import { MAX_PLAYERS, MIN_PLAYERS } from "../lib/constants";
import { formatWarningInput, parseWarningInput } from "../lib/time";

interface SetupScreenProps {
  config: AppConfig;
  builtInPresets: SavedPreset[];
  customPresets: SavedPreset[];
  onPlayerCountChange(count: number): void;
  onPlayerUpdate(index: number, patch: Partial<PlayerConfig>): void;
  onMainTimeChange(seconds: number): void;
  onOvertimeChange(seconds: number): void;
  onWarningChange(warnings: number[]): void;
  onSoundChange(enabled: boolean): void;
  onVibrationChange(enabled: boolean): void;
  onLoadPreset(preset: SavedPreset): void;
  onSavePreset(name: string): void;
  onDeletePreset(id: string): void;
  onStart(): void;
}

export default function SetupScreen({
  config,
  builtInPresets,
  customPresets,
  onPlayerCountChange,
  onPlayerUpdate,
  onMainTimeChange,
  onOvertimeChange,
  onWarningChange,
  onSoundChange,
  onVibrationChange,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onStart
}: SetupScreenProps) {
  const [warningInput, setWarningInput] = useState(() => formatWarningInput(config.warningSeconds));
  const [mainTimeInput, setMainTimeInput] = useState(() => String(config.mainTimeSeconds / 60));
  const [overtimeInput, setOvertimeInput] = useState(() => String(config.overtimeSeconds));
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    setWarningInput(formatWarningInput(config.warningSeconds));
  }, [config.warningSeconds]);

  useEffect(() => {
    setMainTimeInput(String(config.mainTimeSeconds / 60));
  }, [config.mainTimeSeconds]);

  useEffect(() => {
    setOvertimeInput(String(config.overtimeSeconds));
  }, [config.overtimeSeconds]);

  const totalMainMinutes = Math.round((config.mainTimeSeconds / 60) * 10) / 10;

  function commitMainTimeInput() {
    const parsed = Number(mainTimeInput);

    if (Number.isFinite(parsed) && parsed >= 0) {
      onMainTimeChange(parsed * 60);
      return;
    }

    setMainTimeInput(String(config.mainTimeSeconds / 60));
  }

  function commitOvertimeInput() {
    const parsed = Number(overtimeInput);

    if (Number.isFinite(parsed) && parsed >= 0) {
      onOvertimeChange(parsed);
      return;
    }

    setOvertimeInput(String(config.overtimeSeconds));
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Shared-screen board game timer</p>
          <h1>Table Tempo</h1>
          <p className="hero-copy">
            Each player gets a main time bank. Once it runs out, every future turn drops into a
            short overtime window.
          </p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <span>Main Bank</span>
            <strong>{totalMainMinutes} min</strong>
          </article>
          <article className="metric-card">
            <span>Overtime</span>
            <strong>{config.overtimeSeconds}s / turn</strong>
          </article>
          <article className="metric-card">
            <span>Players</span>
            <strong>{config.players.length}</strong>
          </article>
        </div>
      </section>

      <section className="setup-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Setup</p>
              <h2>Game rules</h2>
            </div>
            <div className="stepper">
              <button
                type="button"
                onClick={() => onPlayerCountChange(config.players.length - 1)}
                disabled={config.players.length <= MIN_PLAYERS}
              >
                -
              </button>
              <span>{config.players.length} players</span>
              <button
                type="button"
                onClick={() => onPlayerCountChange(config.players.length + 1)}
                disabled={config.players.length >= MAX_PLAYERS}
              >
                +
              </button>
            </div>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Main time bank (minutes)</span>
              <input
                type="text"
                inputMode="decimal"
                value={mainTimeInput}
                onChange={(event) => setMainTimeInput(event.target.value)}
                onBlur={commitMainTimeInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitMainTimeInput();
                  }
                }}
              />
            </label>

            <label className="field">
              <span>Overtime per turn (seconds)</span>
              <input
                type="text"
                inputMode="numeric"
                value={overtimeInput}
                onChange={(event) => setOvertimeInput(event.target.value)}
                onBlur={commitOvertimeInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitOvertimeInput();
                  }
                }}
              />
            </label>

            <label className="field field-wide">
              <span>Warnings (seconds, comma-separated)</span>
              <input
                type="text"
                value={warningInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setWarningInput(value);
                  const parsed = parseWarningInput(value);

                  if (parsed.length > 0) {
                    onWarningChange(parsed);
                  }
                }}
              />
            </label>
          </div>

          <div className="toggle-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(event) => onSoundChange(event.target.checked)}
              />
              <span>Sound alerts</span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={config.vibrationEnabled}
                onChange={(event) => onVibrationChange(event.target.checked)}
              />
              <span>Vibration alerts</span>
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Players</p>
              <h2>Names and colors</h2>
            </div>
          </div>

          <div className="player-editor-list">
            {config.players.map((player, index) => (
              <div className="player-editor" key={player.id}>
                <label className="field player-name-field">
                  <span>Player {index + 1}</span>
                  <input
                    type="text"
                    value={player.name}
                    maxLength={20}
                    onChange={(event) => onPlayerUpdate(index, { name: event.target.value })}
                  />
                </label>

                <label className="field color-field">
                  <span>Color</span>
                  <input
                    type="color"
                    value={player.color}
                    onChange={(event) => onPlayerUpdate(index, { color: event.target.value })}
                  />
                </label>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Presets</p>
              <h2>Quick starts</h2>
            </div>
          </div>

          <div className="preset-grid">
            {builtInPresets.map((preset) => (
              <button
                className="preset-card"
                type="button"
                key={preset.id}
                onClick={() => onLoadPreset(preset)}
              >
                <strong>{preset.name}</strong>
                <span>
                  {preset.config.mainTimeSeconds / 60} min bank / {preset.config.overtimeSeconds}s
                </span>
              </button>
            ))}
          </div>

          <div className="save-preset-row">
            <input
              type="text"
              placeholder="Preset name"
              value={presetName}
              maxLength={30}
              onChange={(event) => setPresetName(event.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (!presetName.trim()) {
                  return;
                }

                onSavePreset(presetName);
                setPresetName("");
              }}
            >
              Save preset
            </button>
          </div>

          {customPresets.length > 0 ? (
            <div className="custom-preset-list">
              {customPresets.map((preset) => (
                <div className="custom-preset" key={preset.id}>
                  <button type="button" onClick={() => onLoadPreset(preset)}>
                    {preset.name}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => onDeletePreset(preset.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-copy">Saved presets stay on this device and are available offline.</p>
          )}
        </article>
      </section>

      <section className="launch-row">
        <p className="muted-copy">
          Shared-device flow, alert-only overtime, local storage only. Best on a phone or tablet in
          landscape.
        </p>
        <button className="primary-action" type="button" onClick={onStart}>
          Start game
        </button>
      </section>
    </main>
  );
}
