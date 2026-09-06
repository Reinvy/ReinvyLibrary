"use client";

import { useEffect, useRef, useState } from "react";
import { useGamification } from "@/components/providers/GamificationProvider";
import { XP_REWARDS } from "@/lib/gamification/xp-engine";
import OwiMascot from "./OwiMascot";
import { cn } from "@/lib/utils";

const PRESETS = [15, 25] as const;

interface FocusTimerProps {
  labels: {
    title: string;
    subtitle: string;
    start: string;
    pause: string;
    resume: string;
    reset: string;
    done: string;
    minutes: string;
  };
}

/** Cozy reading-focus timer. A finished session grants focus XP once. */
export default function FocusTimer({ labels }: FocusTimerProps) {
  const { recordFocusSession } = useGamification();
  const [minutes, setMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pick = (m: number) => {
    setMinutes(m);
    setSecondsLeft(m * 60);
    setRunning(false);
    setFinished(false);
  };

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRunning(false);
          setFinished(true);
          recordFocusSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, recordFocusSession]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = minutes * 60;
  const pct = total > 0 ? Math.round(((total - secondsLeft) / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-line bg-card p-5 text-center shadow-paper">
      <div className="mx-auto w-fit">
        <OwiMascot mood={running ? "happy" : finished ? "celebrate" : "sleepy"} size={48} />
      </div>
      <p className="mt-1 font-hand text-base text-ink">{labels.title}</p>
      <p className="font-hand text-xs text-ink-muted">{labels.subtitle}</p>

      <p className="mt-2 font-display text-4xl font-bold tabular-nums text-ink" role="timer" aria-live="off">
        {mm}:{ss}
      </p>
      <div className="mx-auto mt-2 h-2 w-full max-w-56 overflow-hidden rounded-full bg-line/60" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-terracotta transition-[width] duration-1000" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            aria-pressed={minutes === m}
            className={cn(
              "rounded-full px-3 py-1 font-hand text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60",
              minutes === m ? "bg-terracotta text-card shadow-paper" : "bg-peach/60 text-ink hover:bg-peach"
            )}
          >
            {m} {labels.minutes}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {!running ? (
          <button
            type="button"
            onClick={() => {
              if (secondsLeft <= 0) setSecondsLeft(minutes * 60);
              setFinished(false);
              setRunning(true);
            }}
            className="rounded-full bg-eucalyptus px-5 py-2 font-display text-sm font-bold text-card shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {secondsLeft < minutes * 60 && secondsLeft > 0 ? labels.resume : labels.start} · +{XP_REWARDS.FOCUS_SESSION} XP
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setRunning(false)}
            className="rounded-full bg-peach px-5 py-2 font-display text-sm font-bold text-ink shadow-paper transition hover:rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {labels.pause}
          </button>
        )}
        <button
          type="button"
          onClick={() => pick(minutes)}
          className="rounded-full border border-line bg-card px-4 py-2 font-hand text-sm text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
        >
          {labels.reset}
        </button>
      </div>
      {finished && (
        <p className="animate-pop mt-2 font-hand text-sm font-bold text-eucalyptus" role="status">
          {labels.done}
        </p>
      )}
    </div>
  );
}
