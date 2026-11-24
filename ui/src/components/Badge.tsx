import { ReactNode } from "react";

const TONE_STYLES = {
  neutral: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

interface BadgeProps {
  tone?: keyof typeof TONE_STYLES;
  children: ReactNode;
}

export default function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}
