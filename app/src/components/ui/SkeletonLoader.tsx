import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  variant?: "card" | "doc" | "grid" | "hero";
  className?: string;
}

/** Soft paper-outline skeletons with a gentle pulse (respects reduced motion). */
export default function SkeletonLoader({ variant = "card", className }: SkeletonLoaderProps) {
  const base = "animate-pulse rounded-card border border-line bg-card/60";

  if (variant === "hero") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className={cn(base, "h-12 w-2/3")} />
        <div className={cn(base, "h-6 w-1/2")} />
        <div className={cn(base, "h-12 w-full rounded-full")} />
      </div>
    );
  }

  if (variant === "doc") {
    return (
      <div className={cn("space-y-5", className)}>
        <div className={cn(base, "h-10 w-3/4")} />
        <div className={cn(base, "h-4 w-full")} />
        <div className={cn(base, "h-4 w-5/6")} />
        <div className={cn(base, "h-4 w-2/3")} />
        <div className={cn(base, "h-40 w-full")} />
        <div className={cn(base, "h-4 w-3/4")} />
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(base, "h-44")} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("rounded-card border border-line bg-card/60 p-6", className)}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded-full bg-line/60" />
        <div className="h-5 w-3/4 rounded-full bg-line/60" />
        <div className="h-4 w-2/3 rounded-full bg-line/60" />
      </div>
    </div>
  );
}
