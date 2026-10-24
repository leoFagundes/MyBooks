type SheetDrag = {
  /** Distância arrastada na direção de saída, em px. */
  offset: number;
  /** Velocidade ao soltar na direção de saída, em px/s. */
  velocity: number;
  /** Tamanho da gaveta no eixo do arrasto, em px. */
  size: number;
};

const DISMISS_FRACTION = 0.3;
const FLICK_VELOCITY = 500;

/** Decide se a gaveta fecha ao soltar o dedo. Um puxão de volta sempre a mantém aberta. */
export function shouldDismissSheet({ offset, velocity, size }: SheetDrag) {
  if (velocity <= -FLICK_VELOCITY) return false;
  return velocity >= FLICK_VELOCITY || offset >= size * DISMISS_FRACTION;
}
