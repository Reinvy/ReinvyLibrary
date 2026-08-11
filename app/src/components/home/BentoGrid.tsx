import type { ReactNode } from "react";

interface BentoGridProps {
  featured: ReactNode;
  recent: ReactNode[];
  progress: ReactNode;
  stats: ReactNode;
}

/** Asymmetric scrapbook bento grid. */
export default function BentoGrid({ featured, recent, progress, stats }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">{featured}</div>
      <div className="lg:col-span-1">{stats}</div>
      {recent.map((card, i) => (
        <div key={i} className="lg:col-span-1">
          {card}
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-2">{progress}</div>
    </div>
  );
}
