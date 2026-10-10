/**
 * Fusión de Imágenes con Canvas API en el Navegador
 *
 * Coloca la imagen recortada con transparencia sobre la imagen de fondo.
 * Todo el procesamiento se realiza localmente en la memoria del dispositivo.
 */

export interface CompositionOptions {
  /**
   * Si es true, el lienzo toma las dimensiones exactas del recorte original
   * y el fondo se adapta cubriendo la superficie (estilo object-fit: cover).
   * Si es false, se toman las dimensiones del fondo y el recorte se centra encima.
   */
  fitMode?: 'match-cutout' | 'match-background';
}

function loadImage(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);

    img.onload = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url);
      }
      resolve(img);
    };

    img.onerror = (err) => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url);
      }
      reject(new Error('No se pudo cargar la imagen para la composición: ' + err));
    };

    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Fusiona la imagen recortada sobre la imagen de fondo utilizando Canvas API.
 * Devuelve un Blob de tipo image/png.
 */
export async function mergeImagesWithCanvas(
  cutoutBlob: Blob,
  backgroundSource: Blob | File | string,
  options: CompositionOptions = { fitMode: 'match-cutout' }
): Promise<Blob> {
  const [cutoutImg, bgImg] = await Promise.all([
    loadImage(cutoutBlob),
    loadImage(backgroundSource),
  ]);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: false });

  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D de Canvas.');
  }

  // Dimensiones del lienzo final:
  // Por defecto adoptamos la resolución del sujeto recortado para mantener
  // la máxima nitidez y calidad original del elemento principal.
  const canvasWidth =
    options.fitMode === 'match-background'
      ? bgImg.naturalWidth
      : cutoutImg.naturalWidth;
  const canvasHeight =
    options.fitMode === 'match-background'
      ? bgImg.naturalHeight
      : cutoutImg.naturalHeight;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // 1. Dibujar el fondo adaptándose proporcionalmente (Cover)
  const bgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let sWidth = bgImg.naturalWidth;
  let sHeight = bgImg.naturalHeight;
  let sx = 0;
  let sy = 0;

  if (bgRatio > canvasRatio) {
    // El fondo es más ancho proporcionalmente: recortar lados
    sWidth = bgImg.naturalHeight * canvasRatio;
    sx = (bgImg.naturalWidth - sWidth) / 2;
  } else {
    // El fondo es más alto proporcionalmente: recortar arriba/abajo
    sHeight = bgImg.naturalWidth / canvasRatio;
    sy = (bgImg.naturalHeight - sHeight) / 2;
  }

  ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);

  // 2. Dibujar la imagen recortada por encima, centrada y manteniendo proporciones
  if (options.fitMode === 'match-cutout') {
    // Si el lienzo coincide con las dimensiones del recorte, se dibuja 1:1 directo
    ctx.drawImage(cutoutImg, 0, 0, canvasWidth, canvasHeight);
  } else {
    // Si el lienzo adoptó el tamaño del fondo, centramos y escalamos la imagen recortada para que quepa proporcionalmente
    const cutoutRatio = cutoutImg.naturalWidth / cutoutImg.naturalHeight;
    let targetW = canvasWidth;
    let targetH = canvasHeight;
    let targetX = 0;
    let targetY = 0;

    if (cutoutRatio > canvasRatio) {
      targetW = canvasWidth;
      targetH = canvasWidth / cutoutRatio;
      targetY = (canvasHeight - targetH) / 2;
    } else {
      targetH = canvasHeight;
      targetW = canvasHeight * cutoutRatio;
      targetX = (canvasWidth - targetW) / 2;
    }

    ctx.drawImage(cutoutImg, targetX, targetY, targetW, targetH);
  }

  // 3. Exportar como PNG final
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Fallo al generar el archivo PNG fusionado.'));
        }
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Crea una imagen de fondo sólida o degradada para pruebas rápidas
 */
export function createPresetBackgroundBlob(
  type: 'white' | 'dark' | 'studio' | 'sunset' | 'nature',
  width = 1920,
  height = 1080
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (type === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'dark') {
    ctx.fillStyle = '#121316';
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'studio') {
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      100,
      width / 2,
      height / 2,
      Math.max(width, height) / 1.2
    );
    grad.addColorStop(0, '#f1f5f9');
    grad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'sunset') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#fdba74');
    grad.addColorStop(0.5, '#f472b6');
    grad.addColorStop(1, '#818cf8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#93c5fd');
    grad.addColorStop(0.6, '#bfdbfe');
    grad.addColorStop(1, '#86efac');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}
