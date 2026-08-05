import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function LocaleLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <SkeletonLoader variant="hero" />
      <div className="mt-12">
        <SkeletonLoader variant="grid" />
      </div>
    </div>
  );
}
