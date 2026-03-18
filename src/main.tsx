import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.DEV) {
      void unregisterDevelopmentServiceWorkers();
      return;
    }

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      void registration.update();
    }).catch(() => undefined);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
