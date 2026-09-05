"use client";

import { useEffect, useRef, useState } from "react";
import BookmarkTab from "@/components/ui/BookmarkTab";
import { cn } from "@/lib/utils";

interface DrawerTab {
  href: string;
  label: string;
  active: boolean;
}

interface SidebarDrawerProps {
  tabs: DrawerTab[];
  overviewLabel: string;
  closeLabel: string;
}

/** Mobile-only slide-over drawer island (desktop sidebar stays server-rendered). */
export default function SidebarDrawer({ tabs, overviewLabel, closeLabel }: SidebarDrawerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, scoped to open state. Focus moves in/out for keyboard users.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  const closeAndRestore = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="bookmark-drawer"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-sticky px-4 py-2 font-hand text-sm text-ink shadow-lift transition hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
      >
        <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
        {overviewLabel}
      </button>

      <div
        id="bookmark-drawer-backdrop"
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeAndRestore}
        aria-hidden
      />
      <div
        id="bookmark-drawer"
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] overflow-y-auto bg-card p-4 pt-16 shadow-lift transition-transform",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={overviewLabel}
        aria-hidden={!open}
        inert={!open}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={closeAndRestore}
          aria-label={closeLabel}
          tabIndex={open ? 0 : -1}
          className="absolute right-3 top-3 rounded-full bg-peach p-2 text-ink transition hover:rotate-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/60"
        >
          <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="space-y-1.5">
          {tabs.map((tab) => (
            <BookmarkTab
              key={tab.href}
              href={tab.href}
              label={tab.label}
              active={tab.active}
              rotate
            />
          ))}
        </div>
      </div>
    </div>
  );
}
