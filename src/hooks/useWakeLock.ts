import { useEffect, useState } from "react";
import type { WakeLockState } from "../types";

export function useWakeLock(enabled: boolean): WakeLockState {
  const [state, setState] = useState<WakeLockState>({
    supported: "wakeLock" in navigator,
    active: false,
    message: null
  });

  useEffect(() => {
    const supported = "wakeLock" in navigator;

    if (!enabled) {
      setState({
        supported,
        active: false,
        message: supported ? null : "Screen Wake Lock is not available on this device."
      });
      return undefined;
    }

    if (!supported) {
      setState({
        supported: false,
        active: false,
        message: "Screen Wake Lock is not available on this device."
      });
      return undefined;
    }

    let released = false;
    let sentinel: WakeLockSentinel | null = null;

    const requestLock = async () => {
      try {
        sentinel = await navigator.wakeLock?.request("screen") ?? null;

        if (!sentinel || released) {
          return;
        }

        setState({
          supported: true,
          active: true,
          message: null
        });

        sentinel.addEventListener("release", () => {
          if (!released) {
            setState({
              supported: true,
              active: false,
              message: "Wake lock was released. Keep the screen active during play."
            });
          }
        });
      } catch {
        setState({
          supported: true,
          active: false,
          message: "Wake lock could not be enabled. Keep the screen from sleeping manually."
        });
      }
    };

    void requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !sentinel?.released) {
        return;
      }

      if (document.visibilityState === "visible") {
        void requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);

  return state;
}
