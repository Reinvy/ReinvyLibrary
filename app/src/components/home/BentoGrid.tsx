import type { ReactNode } from "react";

interface RecentItem {
  slug: string;
  card: ReactNode;
}

interface BentoGridProps {
  featured: ReactNode;
  recent: RecentItem[];
  recentFallback?: ReactNode;
  progress: ReactNode;
  stats: ReactNode;
}

/** Asymmetric scrapbook bento grid. Never collapses: empty recent shows fallback. */
export default function BentoGrid({ featured, recent, recentFallback, progress, stats }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">{featured}</div>
      <div className="lg:col-span-1">{stats}</div>
      {recent.length > 0 ? (
        recent.map(({ slug, card }) => (
          <div key={slug} className="lg:col-span-1">
            {card}
          </div>
        ))
      ) : (
        <div className="lg:col-span-1">{recentFallback}</div>
      )}
      <div className="sm:col-span-2 lg:col-span-2">{progress}</div>
    </div>
  );
}
