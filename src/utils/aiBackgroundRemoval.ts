/**
 * Servicio de Inteligencia Artificial Local para Eliminación de Fondos
 *
 * Utiliza @imgly/background-removal con el modelo IS-Net y ONNX Runtime Web.
 * Se ejecuta 100% en el navegador (en el dispositivo del usuario)
 * con aceleración WebGPU si está disponible o WebAssembly (WASM SIMD) como alternativa.
 */

import { removeBackground, type Config } from '@imgly/background-removal';

export interface AIProgressInfo {
  phase: 'idle' | 'loading' | 'processing';
  percent?: number;
  message?: string;
  backend?: 'WebGPU' | 'WebAssembly';
}

let cachedGpuSupport: boolean | null = null;

export async function checkWebGpuSupport(): Promise<boolean> {
  if (cachedGpuSupport !== null) return cachedGpuSupport;

  if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      cachedGpuSupport = !!adapter;
      return cachedGpuSupport;
    } catch {
      cachedGpuSupport = false;
      return false;
    }
  }

  cachedGpuSupport = false;
  return false;
}

/**
 * Elimina el fondo de una imagen localmente en el navegador.
 * Nunca envía datos al exterior.
 */
export async function removeBackgroundLocally(
  imageSource: Blob | File | string,
  onProgress?: (info: AIProgressInfo) => void
): Promise<Blob> {
  const hasGpu = await checkWebGpuSupport();
  const preferredDevice: 'gpu' | 'cpu' = hasGpu ? 'gpu' : 'cpu';
  const backendName = hasGpu ? 'WebGPU' : 'WebAssembly';

  const createConfig = (device: 'gpu' | 'cpu'): Config => ({
    device,
    model: 'isnet_fp16',
    output: {
      format: 'image/png',
      quality: 1.0,
    },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;

      const currentPhase = key.startsWith('compute') ? 'processing' : 'loading';
      let percent: number | undefined = undefined;

      if (total > 0) {
        percent = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
      }

      const message =
        currentPhase === 'loading'
          ? 'Preparando el motor de inteligencia artificial…'
          : 'Eliminando el fondo…';

      onProgress({
        phase: currentPhase,
        percent,
        message,
        backend: device === 'gpu' ? 'WebGPU' : 'WebAssembly',
      });
    },
  });

  try {
    onProgress?.({
      phase: 'loading',
      percent: undefined,
      message: 'Preparando el motor de inteligencia artificial…',
      backend: backendName,
    });

    const resultBlob = await removeBackground(imageSource, createConfig(preferredDevice));
    return resultBlob;
  } catch (error) {
    // Si falló WebGPU, intentar automáticamente con WebAssembly CPU
    if (preferredDevice === 'gpu') {
      console.warn('Fallo en aceleración WebGPU, reintentando con WebAssembly CPU...', error);
      onProgress?.({
        phase: 'loading',
        percent: undefined,
        message: 'Preparando motor con WebAssembly…',
        backend: 'WebAssembly',
      });

      const fallbackBlob = await removeBackground(imageSource, createConfig('cpu'));
      return fallbackBlob;
    }

    throw error;
  }
}
