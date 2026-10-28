import { isbn13From } from "@/features/books/lib/isbn";

// O BarcodeDetector ainda não está nos tipos do DOM
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
};
type BarcodeDetectorClass = {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
};

/** Os códigos que aparecem no quadro atual do vídeo. */
type Detect = () => Promise<string[]>;

// Uma leitura a cada 120ms: rápido para quem aponta, leve para a bateria
const SCAN_INTERVAL_MS = 120;

const CAMERA: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

async function nativeDetect(video: HTMLVideoElement): Promise<Detect | null> {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorClass })
    .BarcodeDetector;
  if (!Detector) return null;
  const formats = await Detector.getSupportedFormats().catch(
    (): string[] => [],
  );
  if (!formats.includes("ean_13")) return null;
  const detector = new Detector({ formats: ["ean_13"] });
  return async () =>
    (await detector.detect(video)).map((barcode) => barcode.rawValue);
}

// Sem o BarcodeDetector (Safari do iOS, Chrome no Windows), o @zxing lê o
// quadro desenhado num canvas. Só é baixado aqui
async function zxingDetect(video: HTMLVideoElement): Promise<Detect> {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const reader = new BrowserMultiFormatReader(
    new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]),
  );
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async () => {
    if (!context || !video.videoWidth) return [];
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const bitmap =
      BrowserMultiFormatReader.createBinaryBitmapFromCanvas(canvas);
    return [reader.decodeBitmap(bitmap).getText()];
  };
}

export type BarcodeReaderCallbacks = {
  /** Um ISBN lido. A câmera já desligou. */
  onIsbn: (isbn: string) => void;
  /** Um código de barras que não é de livro (978 ou 979). */
  onOtherCode?: () => void;
};

/**
 * Liga a câmera traseira no `video` e lê códigos EAN-13 até achar um ISBN.
 * Devolve o que desliga a câmera. Lança o erro do getUserMedia (sem
 * permissão, sem câmera…) ou o do `signal`, sempre com a câmera desligada.
 */
export async function startBarcodeReader(
  video: HTMLVideoElement,
  { onIsbn, onOtherCode }: BarcodeReaderCallbacks,
  signal?: AbortSignal,
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia(CAMERA);
  let stopped = false;
  let timer = 0;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    for (const track of stream.getTracks()) track.stop();
    if (video.srcObject === stream) video.srcObject = null;
  };

  let detect: Detect;
  try {
    // Cancelada antes de chegar ao vídeo (o StrictMode monta duas vezes): a
    // outra tentativa é que mostra a câmera
    signal?.throwIfAborted();
    detect = (await nativeDetect(video)) ?? (await zxingDetect(video));
    signal?.throwIfAborted();
    video.srcObject = stream;
    await video.play();
  } catch (error) {
    stop();
    throw error;
  }

  const scan = async () => {
    if (stopped) return;
    // Quadro sem código (ou ainda sem imagem): tenta no próximo
    const codes = await detect().catch((): string[] => []);
    for (const code of codes) {
      if (stopped) return;
      const isbn = isbn13From(code);
      if (!isbn) {
        onOtherCode?.();
        continue;
      }
      stop();
      onIsbn(isbn);
    }
    if (!stopped) timer = window.setTimeout(scan, SCAN_INTERVAL_MS);
  };
  void scan();
  return stop;
}
