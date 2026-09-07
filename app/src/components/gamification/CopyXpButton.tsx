"use client";

import { useGamification } from "@/components/providers/GamificationProvider";
import CopyButton from "@/components/ui/CopyButton";

interface CopyXpButtonProps {
  text: string;
  label?: string;
}

/** Copy button that also grants snippet-copy XP (capped daily, anti-farm). */
export default function CopyXpButton({ text, label }: CopyXpButtonProps) {
  const { recordCopy } = useGamification();
  return (
    <CopyButton
      text={text}
      label={label}
      onCopied={(ok) => {
        if (ok) recordCopy();
      }}
    />
  );
}
