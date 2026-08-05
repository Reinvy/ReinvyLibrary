import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  tone?: "success" | "info";
  className?: string;
}

/** Transient toast, bottom-center, paper-styled. Rendered inline by its trigger. */
export default function Toast({ message, tone = "success", className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-card px-5 py-2.5 font-hand text-sm text-ink shadow-lift",
        tone === "success" && "border-eucalyptus/40",
        className
      )}
    >
      {message}
    </div>
  );
}
