"use client";

import { useProgress } from "@/components/providers/ProgressProvider";
import type { ChecklistItem } from "@/lib/types";

interface ChecklistProps {
  topicSlug: string;
  items: ChecklistItem[];
}

/** Interactive GFM checklist, persisted via localStorage progress provider. */
export default function Checklist({ topicSlug, items }: ChecklistProps) {
  const { progress, toggleItem } = useProgress();
  const checkedIds = progress[topicSlug]?.checked ?? [];
  const done = items.filter((i) => checkedIds.includes(i.id)).length;

  return (
    <div className="my-6 rounded-2xl border border-line bg-card p-4 shadow-paper">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-hand text-sm text-ink-muted">
          {done}/{items.length} done
        </p>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-sage">
          <div
            className="h-full rounded-full bg-eucalyptus transition-all"
            style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = checkedIds.includes(item.id);
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(topicSlug, item.id)}
                  className="mt-1 h-4 w-4 rounded border-line accent-eucalyptus"
                />
                <span
                  className={checked ? "text-ink-muted line-through opacity-70" : "text-ink"}
                >
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
