import type { Locale } from "@/lib/types";
import OwiMascot from "./OwiMascot";

const TIPS: { en: string; id: string }[] = [
  { en: "Small steps daily beat weekend marathons.", id: "Langkah kecil tiap hari mengalahkan maraton akhir pekan." },
  { en: "Copy a snippet, then rewrite it from memory.", id: "Salin snippet, lalu tulis ulang dari ingatan." },
  { en: "Read the same topic in EN + ID for bonus XP.", id: "Baca topik yang sama dalam EN + ID untuk bonus XP." },
  { en: "Tick syllabus boxes — your future self says thanks.", id: "Centang kotak silabus — dirimu di masa depan berterima kasih." },
  { en: "Stuck? Switch category, keep the streak warm.", id: "Buntu? Ganti kategori, jaga streak tetap hangat." },
  { en: "Teach Owi: explain what you learned out loud.", id: "Ajari Owi: jelaskan yang kamu pelajari dengan lantang." },
  { en: "Finish one page fully before opening five tabs.", id: "Tuntaskan satu halaman penuh sebelum buka lima tab." },
];

interface WashiTipProps {
  locale: Locale;
  title: string;
}

/** Deterministic tip-of-the-day (rotates by day-of-year, no storage needed). */
export default function WashiTip({ locale, title }: WashiTipProps) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  return (
    <div className="sticky-note relative h-full rounded-2xl border border-peach bg-peach/40 p-6 shadow-paper">
      <div className="washi" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="font-hand text-lg text-ink">{title}</p>
        <OwiMascot mood="sleepy" size={40} />
      </div>
      <blockquote className="mt-3 border-l-4 border-terracotta/50 pl-3 font-hand text-base italic text-ink">
        “{locale === "en" ? tip.en : tip.id}”
      </blockquote>
    </div>
  );
}
