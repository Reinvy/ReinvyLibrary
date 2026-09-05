import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function DocLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex gap-8">
        <div className="hidden w-56 shrink-0 lg:block">
          <SkeletonLoader variant="card" />
        </div>
        <div className="min-w-0 flex-1">
          <SkeletonLoader variant="doc" />
        </div>
        <div className="hidden w-56 shrink-0 lg:block">
          <SkeletonLoader variant="card" />
        </div>
      </div>
    </div>
  );
}
