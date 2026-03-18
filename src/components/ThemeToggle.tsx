import type { ThemePreference } from "../types";

interface ThemeToggleProps {
  value: ThemePreference;
  onChange(value: ThemePreference): void;
}

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" }
];

export default function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "theme-chip is-active" : "theme-chip"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
