import { useId, useState, type ReactNode } from "react";
import { getTerm } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** Hover or tap to hear what a word means. Shows the full name; short name only inside the popup. */
export function Hint({
  term,
  children,
  className,
  captureClick = true,
}: {
  term: string;
  children?: ReactNode;
  className?: string;
  /** Set false inside links so a tap still opens the page. */
  captureClick?: boolean;
}) {
  const g = getTerm(term);
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!g) return <>{children ?? term}</>;

  return (
    <span
      className={cn("relative inline-flex max-w-full align-baseline", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        className="cursor-help border-b border-dotted border-current/50 text-left"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={
          captureClick
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((v) => !v);
              }
            : undefined
        }
      >
        {children ?? g.name}
      </span>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-64 rounded-md bg-ink p-3 text-left text-xs font-normal normal-case tracking-normal text-primary-fg shadow-lg"
        >
          <span className="block font-medium">
            {g.name}
            {g.short ? ` · also called ${g.short}` : ""}
          </span>
          <span className="mt-1 block leading-relaxed text-primary-fg/85">{g.hint}</span>
        </span>
      ) : null}
    </span>
  );
}
