// Ilustrações minimalistas em traço fino para os estados vazios (spec §8).
// Usam currentColor: a cor vem da classe de quem usa.

type IllustrationProps = React.ComponentProps<"svg">;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function EmptyShelfIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <path d="M8 68h104" {...stroke} />
      <rect x="22" y="30" width="12" height="38" rx="1.5" {...stroke} />
      <rect x="36" y="22" width="10" height="46" rx="1.5" {...stroke} />
      <path d="M50 68l10-40 9 2.4-10 40" {...stroke} />
      <path d="M78 54h22M78 60h14" strokeDasharray="2 4" {...stroke} />
    </svg>
  );
}

export function SearchIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <circle cx="54" cy="36" r="18" {...stroke} />
      <path d="M67 49l14 14" {...stroke} />
      <path d="M46 36h16M54 28v16" strokeDasharray="2 4" {...stroke} />
      <path d="M20 70h80" {...stroke} />
    </svg>
  );
}

export function QuietBellIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <path d="M46 52V36a14 14 0 0128 0v16l5 6H41z" {...stroke} />
      <path d="M55 64a5 5 0 0010 0" {...stroke} />
      <path d="M86 24h10M90 18l-4 12M96 30h10" {...stroke} />
    </svg>
  );
}

export function LockedShelfIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <path d="M8 68h104" {...stroke} />
      <rect x="22" y="34" width="10" height="34" rx="1.5" {...stroke} />
      <rect x="34" y="28" width="9" height="40" rx="1.5" {...stroke} />
      <rect x="68" y="40" width="26" height="20" rx="3" {...stroke} />
      <path d="M73 40v-6a8 8 0 0116 0v6" {...stroke} />
      <path d="M81 48v4" {...stroke} />
    </svg>
  );
}

export function QuoteIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <path d="M34 30c-6 2-10 7-10 14v6h12v-12h-6c0-4 2-6 6-7" {...stroke} />
      <path d="M58 30c-6 2-10 7-10 14v6h12v-12h-6c0-4 2-6 6-7" {...stroke} />
      <path d="M72 38h28M72 46h22M72 54h26" strokeDasharray="2 4" {...stroke} />
      <path d="M20 68h80" {...stroke} />
    </svg>
  );
}

export function CollectionsIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <path d="M44 22l-8 40 22 4 8-40z" {...stroke} />
      <rect x="52" y="16" width="22" height="42" rx="2" {...stroke} />
      <path d="M80 20l12 38-21 7" {...stroke} />
      <path d="M20 70h80" {...stroke} />
    </svg>
  );
}

export function ReadersIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <circle cx="46" cy="30" r="9" {...stroke} />
      <path d="M30 60c2-10 8-15 16-15s14 5 16 15" {...stroke} />
      <circle cx="76" cy="34" r="7" {...stroke} />
      <path d="M66 60c1-7 5-11 10-11s9 4 10 11" strokeDasharray="2 4" {...stroke} />
      <path d="M20 68h80" {...stroke} />
    </svg>
  );
}
