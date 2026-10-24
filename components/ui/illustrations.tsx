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
