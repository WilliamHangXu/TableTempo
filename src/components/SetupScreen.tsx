import { useEffect, useState } from "react";
import { DEFAULT_PLAYER_COLORS, MAX_PLAYERS, MIN_PLAYERS } from "../lib/constants";
import { formatClock, formatWarningInput, parseWarningInput } from "../lib/time";
import type { AppConfig, PlayerConfig, SavedPreset, ThemePreference } from "../types";
import ThemeToggle from "./ThemeToggle";

interface SetupScreenProps {
  config: AppConfig;
  builtInPresets: SavedPreset[];
  customPresets: SavedPreset[];
  themePreference: ThemePreference;
  onThemePreferenceChange(value: ThemePreference): void;
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

function getPlayerInitial(name: string, fallbackIndex: number): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : String(fallbackIndex + 1);
}

export default function SetupScreen({
  config,
  builtInPresets,
  customPresets,
  themePreference,
  onThemePreferenceChange,
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

  function commitWarningInput() {
    const parsed = parseWarningInput(warningInput);

    if (parsed.length > 0) {
      onWarningChange(parsed);
      return;
    }

    setWarningInput(formatWarningInput(config.warningSeconds));
  }

  function removeWarning(target: number) {
    const nextWarnings = config.warningSeconds.filter((warning) => warning !== target);

    if (nextWarnings.length > 0) {
      onWarningChange(nextWarnings);
    }
  }

  return (
    <main className="app-shell page-shell">
      <header className="screen-masthead">
        <div className="masthead-copy">
          <p className="brand-line">
            <span className="brand-name">Table Tempo</span>
            <span className="brand-step">/ Setup</span>
          </p>
          <p className="screen-copy">
            One shared screen, one time bank each, and clean overtime when the table needs a push.
          </p>
        </div>

        <div className="masthead-tools">
          <ThemeToggle value={themePreference} onChange={onThemePreferenceChange} />
        </div>
      </header>

      <section className="panel section-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Players — {config.players.length} of {MAX_PLAYERS}</p>
            <h2>Seat the table</h2>
          </div>

          <div className="count-stepper">
            <button
              type="button"
              onClick={() => onPlayerCountChange(config.players.length - 1)}
              disabled={config.players.length <= MIN_PLAYERS}
            >
              −
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

        <div className="setup-player-grid">
          {config.players.map((player, index) => (
            <article
              className="setup-player-card"
              key={player.id}
              style={{ ["--player-accent" as string]: player.color }}
            >
              <div className="setup-player-main">
                <div className="player-medallion">{getPlayerInitial(player.name, index)}</div>
                <label className="inline-name-field">
                  <span className="visually-hidden">Player {index + 1} name</span>
                  <input
                    type="text"
                    value={player.name}
                    maxLength={20}
                    onChange={(event) => onPlayerUpdate(index, { name: event.target.value })}
                  />
                </label>
              </div>

              <div className="swatch-row">
                {DEFAULT_PLAYER_COLORS.map((color) => (
                  <button
                    key={`${player.id}-${color}`}
                    type="button"
                    className={player.color.toLowerCase() === color.toLowerCase() ? "color-swatch is-selected" : "color-swatch"}
                    style={{ ["--swatch-color" as string]: color }}
                    onClick={() => onPlayerUpdate(index, { color })}
                    aria-label={`Set ${player.name || `player ${index + 1}`} color`}
                  />
                ))}

                <label
                  className="custom-swatch"
                  style={{ ["--swatch-color" as string]: player.color }}
                >
                  <span>Custom</span>
                  <input
                    type="color"
                    value={player.color}
                    onChange={(event) => onPlayerUpdate(index, { color: event.target.value })}
                    aria-label={`Choose a custom color for ${player.name || `player ${index + 1}`}`}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="time-control-grid">
        <article className="panel time-card">
          <p className="section-kicker">Main bank</p>
          <div className="time-value-wrap">
            <input
              className="time-value-input"
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
            <span className="time-unit">minutes per player</span>
          </div>
          <div className="control-stepper">
            <button type="button" onClick={() => onMainTimeChange(Math.max(0, config.mainTimeSeconds - 60))}>
              −1 min
            </button>
            <button type="button" onClick={() => onMainTimeChange(config.mainTimeSeconds + 60)}>
              +1 min
            </button>
          </div>
        </article>

        <article className="panel time-card">
          <p className="section-kicker">Overtime</p>
          <div className="time-value-wrap">
            <input
              className="time-value-input time-value-input--mono"
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
            <span className="time-unit">seconds per turn</span>
          </div>
          <div className="control-stepper">
            <button
              type="button"
              onClick={() => onOvertimeChange(Math.max(5, config.overtimeSeconds - 5))}
            >
              −5 sec
            </button>
            <button type="button" onClick={() => onOvertimeChange(config.overtimeSeconds + 5)}>
              +5 sec
            </button>
          </div>
        </article>

        <article className="panel time-card warning-card">
          <p className="section-kicker">Warnings</p>
          <div className="warning-chip-row">
            {config.warningSeconds.map((warning) => (
              <button
                key={warning}
                type="button"
                className="warning-chip"
                onClick={() => removeWarning(warning)}
                disabled={config.warningSeconds.length === 1}
                title="Remove warning"
              >
                {formatClock(warning * 1000)}
              </button>
            ))}
          </div>
          <label className="warning-input-field">
            <span className="time-unit">Comma-separated seconds</span>
            <input
              type="text"
              value={warningInput}
              onChange={(event) => setWarningInput(event.target.value)}
              onBlur={commitWarningInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitWarningInput();
                }
              }}
            />
          </label>
        </article>
      </section>

      <section className="toggle-chip-row">
        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={config.soundEnabled}
            onChange={(event) => onSoundChange(event.target.checked)}
          />
          <span>Sound alerts</span>
        </label>

        <label className="toggle-chip">
          <input
            type="checkbox"
            checked={config.vibrationEnabled}
            onChange={(event) => onVibrationChange(event.target.checked)}
          />
          <span>Vibration alerts</span>
        </label>
      </section>

      <section className="panel section-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Presets</p>
            <h2>Quick starts</h2>
          </div>
        </div>

        <div className="preset-pill-row">
          {builtInPresets.map((preset) => (
            <button
              className="preset-pill"
              type="button"
              key={preset.id}
              onClick={() => onLoadPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="custom-preset-form">
          <input
            type="text"
            value={presetName}
            maxLength={28}
            placeholder="Name this setup"
            onChange={(event) => setPresetName(event.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = presetName.trim();

              if (!trimmed) {
                return;
              }

              onSavePreset(trimmed);
              setPresetName("");
            }}
            disabled={!presetName.trim()}
          >
            + Save custom
          </button>
        </div>

        {customPresets.length > 0 ? (
          <div className="saved-preset-list">
            {customPresets.map((preset) => (
              <div className="saved-preset-pill" key={preset.id}>
                <button type="button" onClick={() => onLoadPreset(preset)}>
                  {preset.name}
                </button>
                <button
                  type="button"
                  className="saved-preset-delete"
                  onClick={() => onDeletePreset(preset.id)}
                  aria-label={`Delete ${preset.name}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-copy">Save named setups for different games or different groups.</p>
        )}
      </section>

      <section className="setup-footer">
        <p className="muted-copy">
          Current format: {config.players.length} players, {config.mainTimeSeconds / 60} minute bank,
          {" "}
          {config.overtimeSeconds} second overtime.
        </p>
        <button className="primary-action" type="button" onClick={onStart}>
          Start game
        </button>
      </section>
    </main>
  );
}
