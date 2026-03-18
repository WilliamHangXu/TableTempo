import ReactDOM from "react-dom/client";
import App from "./App";
import { normalizeAppearance, resolveThemePreference } from "./lib/appearance";
import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "./lib/constants";
import "./styles.css";

function applyInitialTheme(): void {
  try {
    const raw = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
      .map((key) => window.localStorage.getItem(key))
      .find((value) => value !== null);
    const appearance = raw ? normalizeAppearance((JSON.parse(raw) as { appearance?: unknown }).appearance as never) : normalizeAppearance(undefined);
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = resolveThemePreference(appearance.themePreference, systemPrefersDark);

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
}

async function unregisterDevelopmentServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => key.startsWith("table-clock-") || key.startsWith("table-tempo-"))
        .map((key) => caches.delete(key))
    );
  }
}

applyInitialTheme();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.DEV) {
      void unregisterDevelopmentServiceWorkers();
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        void registration.update();
      })
      .catch(() => undefined);
  });
}

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
