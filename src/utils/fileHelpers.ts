/**
 * Utilidades para manejo de archivos, nombres y descargas
 */

export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/** Tamaño máximo del archivo de entrada (evita bloquear la pestaña). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Número máximo de píxeles (ancho × alto) admitido. */
export const MAX_PIXELS = 40_000_000;

type Validation = { valid: boolean; reason?: string };

/**
 * Comprobaciones rápidas y síncronas: existencia, tamaño y tipo.
 * Acepta solo los formatos de la lista; si el navegador no informa del tipo
 * MIME (cadena vacía), se admite únicamente por extensión conocida.
 */
export function isValidImageFile(file: File): Validation {
  if (!file) {
    return { valid: false, reason: 'No se ha seleccionado ningún archivo.' };
  }

  if (file.size === 0) {
    return { valid: false, reason: 'El archivo está vacío.' };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      valid: false,
      reason: `El archivo es demasiado grande (${formatFileSize(file.size)}). El máximo es ${formatFileSize(MAX_FILE_BYTES)}.`,
    };
  }

  const type = (file.type || '').toLowerCase();
  const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const mimeOk = SUPPORTED_MIME_TYPES.includes(type);
  const extOk = SUPPORTED_EXTENSIONS.includes(extension);

  if (!(mimeOk || (type === '' && extOk))) {
    return {
      valid: false,
      reason: `Formato de imagen no compatible ("${type || extension}"). Usa JPEG, PNG o WebP.`,
    };
  }

  return { valid: true };
}

/** Decodifica la imagen para comprobar que es real y obtener sus dimensiones. */
async function readImageSize(file: Blob): Promise<{ width: number; height: number } | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    }

    return await new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

/**
 * Validación completa: tipo y tamaño (síncrono) + decodificación real y
 * límite de píxeles. Evita archivos con extensión/MIME falsos e imágenes
 * enormes que agotarían la memoria de la pestaña.
 */
export async function validateImageFile(file: File): Promise<Validation> {
  const quick = isValidImageFile(file);
  if (!quick.valid) return quick;

  const size = await readImageSize(file);
  if (!size || size.width === 0 || size.height === 0) {
    return { valid: false, reason: 'No se pudo leer la imagen. Puede estar dañada.' };
  }

  if (size.width * size.height > MAX_PIXELS) {
    return {
      valid: false,
      reason: `La imagen es demasiado grande (${size.width}×${size.height} px). El máximo es ${MAX_PIXELS / 1_000_000} megapíxeles.`,
    };
  }

  return { valid: true };
}

export function generateOutputFilename(
  originalName: string | undefined,
  suffix: '_sin_fondo' | '_con_fondo'
): string {
  if (!originalName || originalName.trim() === '') {
    return suffix === '_sin_fondo' ? 'imagen_sin_fondo.png' : 'imagen_con_fondo.png';
  }

  // Quitar la extensión actual
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;

  // Sanitizar caracteres conflictivos (incluidos los de control) y acotar la longitud
  const cleanBase =
    // eslint-disable-next-line no-control-regex
    baseName.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, '_').trim().slice(0, 100) || 'imagen';

  return `${cleanBase}${suffix}.png`;
}

/**
 * Inicia la descarga del blob y libera el object URL pasado un tiempo
 * (algunos navegadores necesitan que siga vivo mientras empieza la descarga).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Descarga automática bloqueada por el navegador:', err);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
