/**
 * Brilho muito sutil da cor da capa no topo da página do livro (spec §5.6).
 * Mora no container da página e recebe a cor pelo próprio `--cover`: com o
 * Activity, uma variável global de uma página escondida vazaria para a outra.
 */
export function AmbientGlow({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="ambient-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-112"
      style={{ "--cover": color } as React.CSSProperties}
    />
  );
}
