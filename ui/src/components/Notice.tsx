import { ReactNode } from "react";

export type NoticeTone = "success" | "error" | "warning" | "info";

const TONE_STYLES: Record<NoticeTone, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

interface NoticeProps {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
}

/** The one box for action results, load errors, and standing warnings. */
export default function Notice({ tone, children, className }: NoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`p-3 rounded-md border text-sm whitespace-pre-wrap ${TONE_STYLES[tone]}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
}
