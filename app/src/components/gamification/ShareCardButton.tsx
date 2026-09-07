"use client";

import { useState } from "react";
import { useGamification } from "@/components/providers/GamificationProvider";
import { levelTitle } from "@/lib/gamification/xp-engine";
import { BADGES } from "@/lib/gamification/xp-engine";
import { TECHNOLOGIES } from "@/lib/constants";
import type { Locale } from "@/lib/types";

/** Palette mirrors src/app/globals.css (canvas needs literal colors). */
const C = {
  paper: "#FAFAF7",
  card: "#FFFFFF",
  ink: "#2D3142",
  muted: "#4C566A",
  sticky: "#FFF3B0",
  peach: "#FDE2E4",
  sage: "#E8F3E8",
  line: "#E5E5E0",
  terracotta: "#E07A5F",
  eucalyptus: "#81B29A",
};

interface ShareCardButtonProps {
  locale: Locale;
  downloadLabel: string;
  shareLabel: string;
  sharedLabel: string;
  title: string;
  tagline: string;
}

/** Renders a shareable achievement card on <canvas> (no server needed). */
export default function ShareCardButton({
  locale,
  downloadLabel,
  shareLabel,
  sharedLabel,
  title,
  tagline,
}: ShareCardButtonProps) {
  const { state, ready } = useGamification();
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  const draw = (): HTMLCanvasElement => {
    const W = 1200;
    const H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Paper background + card.
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.card;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(48, 48, W - 96, H - 96, 40);
    ctx.fill();
    ctx.stroke();

    // Washi strip.
    ctx.save();
    ctx.translate(W / 2, 48);
    ctx.rotate(-0.03);
    ctx.fillStyle = "#F7F3E8";
    ctx.fillRect(-110, -16, 220, 34);
    ctx.restore();

    // Owi (simplified paper owl).
    const ox = 210;
    const oy = 330;
    ctx.fillStyle = C.peach;
    ctx.beginPath();
    ctx.moveTo(ox - 78, oy - 78);
    ctx.lineTo(ox - 96, oy - 122);
    ctx.lineTo(ox - 52, oy - 96);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox + 78, oy - 78);
    ctx.lineTo(ox + 96, oy - 122);
    ctx.lineTo(ox + 52, oy - 96);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#F7F3E8";
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(ox, oy, 88, 96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eyes.
    for (const dx of [-34, 34]) {
      ctx.fillStyle = C.card;
      ctx.beginPath();
      ctx.arc(ox + dx, oy - 22, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ox + dx + 4, oy - 20, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Beak + smile.
    ctx.fillStyle = C.terracotta;
    ctx.beginPath();
    ctx.moveTo(ox - 12, oy + 8);
    ctx.lineTo(ox + 12, oy + 8);
    ctx.lineTo(ox, oy + 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ox, oy + 26, 22, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Texts.
    const tx = 380;
    ctx.fillStyle = C.terracotta;
    ctx.font = "700 40px Quicksand, sans-serif";
    ctx.fillText("ReinvyLibrary", tx, 170);
    ctx.fillStyle = C.ink;
    const level = Math.max(1, (() => {
      const thresholds = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
      let lv = 1;
      for (let i = 0; i < thresholds.length; i++) if (state.totalXp >= thresholds[i]) lv = i + 1;
      if (lv >= 10) lv = 10 + Math.floor((state.totalXp - 2700) / 600);
      return lv;
    })());
    ctx.font = "700 64px Quicksand, sans-serif";
    ctx.fillText(`${title} · Lv ${level}`, tx, 245);
    ctx.fillStyle = C.muted;
    ctx.font = "500 36px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(levelTitle(level, locale), tx, 295);

    // Stat pills.
    const stats: [string, string][] = [
      [`${state.totalXp}`, locale === "en" ? "XP" : "XP"],
      [`${state.streak}`, locale === "en" ? "day streak" : "streak harian"],
      [`${Object.keys(state.badges).length}/${BADGES.length}`, locale === "en" ? "badges" : "lencana"],
      [
        `${Object.keys(state.technologiesRead).length}/${TECHNOLOGIES.length}`,
        locale === "en" ? "stamps" : "stempel",
      ],
    ];
    let sx = tx;
    const sy = 360;
    ctx.font = "700 34px Quicksand, sans-serif";
    for (const [value, label] of stats) {
      const pillW = Math.max(150, ctx.measureText(`${value} ${label}`).width + 56);
      ctx.fillStyle = C.sage;
      ctx.beginPath();
      ctx.roundRect(sx, sy, pillW, 72, 36);
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.fillText(value, sx + 28, sy + 47);
      ctx.fillStyle = C.muted;
      ctx.font = "500 26px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(label, sx + 28 + ctx.measureText(`${value} `).width + 28, sy + 45);
      ctx.font = "700 34px Quicksand, sans-serif";
      sx += pillW + 20;
      if (sx > W - 200) break;
    }

    ctx.fillStyle = C.muted;
    ctx.font = "italic 500 30px Kalam, cursive";
    ctx.fillText(tagline, tx, 520);

    return canvas;
  };

  const toBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => draw().toBlob((b) => resolve(b), "image/png"));

  const onDownload = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reinvylibrary-level-${state.totalXp}xp.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const blob = await toBlob();
      const file = blob ? new File([blob], "reinvylibrary.png", { type: "image/png" }) : undefined;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ReinvyLibrary" });
        setShared(true);
      } else if (navigator.share) {
        await navigator.share({ title: "ReinvyLibrary", text: tagline, url: window.location.origin });
        setShared(true);
      } else {
        await onDownload();
      }
    } catch {
      /* user cancelled — silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onDownload}
        disabled={!ready || busy}
        className="rounded-full border border-line bg-card px-4 py-2 font-hand text-sm text-ink shadow-paper transition hover:-rotate-1 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
      >
        {downloadLabel}
      </button>
      <button
        type="button"
        onClick={onShare}
        disabled={!ready || busy}
        className="rounded-full bg-terracotta px-4 py-2 font-hand text-sm text-card shadow-paper transition hover:rotate-1 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
      >
        {shared ? sharedLabel : shareLabel}
      </button>
    </span>
  );
}
