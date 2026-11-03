"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";

// Calibrados na sonda: com a capa de frente, ambiente + luz principal + painéis
// devolvem a cor da imagem (sem tone mapping, o 3D bate com o 2D)
const AMBIENT = 1.3;
const KEY = 2;

/**
 * A luz do estúdio (spec §5.7): painéis renderizados uma vez num mapa de
 * ambiente, sem HDR para baixar. A luz principal vem do alto, à direita: de
 * frente, a face recebe o mesmo que a imagem 2D, e a troca do 2D para o 3D
 * não muda de cor; girada para 3/4, ela se volta para a luz e reflete o
 * painel da direita (o brilho). Nenhum painel fica atrás da câmera. A mesma
 * luz vale no visualizador e na landing.
 */
export function StudioLights() {
  return (
    <>
      <ambientLight intensity={AMBIENT} />
      <directionalLight position={[3, 5, 4]} intensity={KEY} />
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[5, 1.5, 3]}
          scale={[3, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          position={[-5, 2, 2]}
          scale={[3, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, 2, -6]}
          scale={[8, 3, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={0.8}
          position={[0, 7, 0]}
          scale={3}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  );
}

/** O estúdio do visualizador: a luz e a sombra de contato no chão. */
export function Studio({ floorY }: { floorY: number }) {
  return (
    <>
      <StudioLights />
      <ContactShadows
        position={[0, floorY, 0]}
        scale={10}
        far={3}
        blur={2.6}
        opacity={0.35}
        resolution={512}
      />
    </>
  );
}
