import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  default: "bg-chip text-ink",
  ok: "bg-ok/12 text-ok",
  warn: "bg-warn/12 text-warn",
  danger: "bg-danger/12 text-danger",
  ink: "bg-ink text-primary-fg",
  muted: "bg-transparent text-muted border border-line",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
