type AlertKind = "warning" | "timeout";

const audioContextFactory = () => {
  const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Context ? new Context() : null;
};

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (sharedContext) {
    return sharedContext;
  }

  sharedContext = audioContextFactory();
  return sharedContext;
}

function playTone(frequency: number, durationMs: number, volume: number): void {
  const context = getContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    void context.resume();
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000);
}

export function triggerAlert(kind: AlertKind, soundEnabled: boolean, vibrationEnabled: boolean): void {
  if (soundEnabled) {
    if (kind === "timeout") {
      playTone(220, 600, 0.1);
      window.setTimeout(() => playTone(196, 600, 0.08), 180);
    } else {
      playTone(420, 220, 0.05);
    }
  }

  if (vibrationEnabled && "vibrate" in navigator) {
    navigator.vibrate(kind === "timeout" ? [200, 100, 220] : [120]);
  }
}
