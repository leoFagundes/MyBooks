/** A capa aberta não deita de todo: fica um pouco erguida, como num livro real. */
export const OPEN_ANGLE = (170 * Math.PI) / 180;

// A mola da abertura passa um pouco do repouso e assenta: até aqui (uns
// 175°), a capa ainda não chega ao chão nem às folhas viradas
const MAX_OPEN = 1.03;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * O ângulo da dobra para a abertura (0 fechada, 1 aberta), preso entre 0 e o
 * máximo. Uma mola que passe do zero não leva a capa para dentro do miolo: com
 * o pivô na face de dentro da capa, qualquer ângulo de 0 a 180° a mantém
 * acima dele.
 */
export function hingeAngle(open: number) {
  return clamp(open, 0, MAX_OPEN) * OPEN_ANGLE;
}

/** Quanto a folha virou, de 0 (à direita) a 1 (deitada à esquerda), sem passar. */
export function leafTurn(turned: number) {
  return clamp(turned, 0, 1);
}
