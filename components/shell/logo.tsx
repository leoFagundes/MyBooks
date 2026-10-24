import Link from "next/link";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Três lombadas e o nome em Instrument Serif. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href={routes.home}
      aria-label="MyBooks, página inicial"
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-control text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <rect
          x="2.5"
          y="5"
          width="3.5"
          height="12"
          rx="1"
          fill="currentColor"
        />
        <rect
          x="7.75"
          y="2.5"
          width="3.5"
          height="14.5"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="13.4"
          y="6"
          width="3.5"
          height="11"
          rx="1"
          fill="currentColor"
          transform="rotate(10 15.15 11.5)"
        />
      </svg>
      <span className="font-serif text-xl leading-none tracking-tight">
        MyBooks
      </span>
    </Link>
  );
}
