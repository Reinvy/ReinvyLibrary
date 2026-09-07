"use client";

import { useRef, useState } from "react";
import { useGamification } from "@/components/providers/GamificationProvider";

interface DataManagerProps {
  labels: {
    title: string;
    description: string;
    export: string;
    import: string;
    reset: string;
    resetConfirm: string;
    resetCancel: string;
    importOk: string;
    importFail: string;
  };
}

/** Local-data trust panel: export / import / reset the gamification store. */
export default function DataManager({ labels }: DataManagerProps) {
  const { exportJson, importJson, resetAll } = useGamification();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reinvylibrary-progress.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const ok = importJson(text);
    setNotice(ok ? labels.importOk : labels.importFail);
    window.setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-paper">
      <p className="font-hand text-base text-ink">{labels.title}</p>
      <p className="mt-1 font-hand text-xs text-ink-muted">{labels.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExport}
          className="rounded-full border border-line bg-paper px-4 py-2 font-hand text-sm text-ink shadow-paper transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
        >
          {labels.export}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-line bg-paper px-4 py-2 font-hand text-sm text-ink shadow-paper transition hover:rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
        >
          {labels.import}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          aria-hidden={!confirming}
          tabIndex={-1}
          onChange={(e) => {
            void onImportFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full border border-terracotta/40 bg-peach/50 px-4 py-2 font-hand text-sm text-terracotta transition hover:bg-peach focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
          >
            {labels.reset}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetAll();
                setConfirming(false);
              }}
              className="rounded-full bg-terracotta px-4 py-2 font-hand text-sm text-card shadow-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              {labels.resetConfirm}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-line bg-card px-4 py-2 font-hand text-sm text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
            >
              {labels.resetCancel}
            </button>
          </span>
        )}
      </div>
      {notice && (
        <p className="mt-2 font-hand text-sm text-eucalyptus" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
