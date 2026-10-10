/**
 * Utilidades para manejo de archivos, nombres y descargas
 */

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function isValidImageFile(file: File): { valid: boolean; reason?: string } {
  if (!file) {
    return { valid: false, reason: 'No se ha seleccionado ningún archivo.' };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const hasValidExt = SUPPORTED_EXTENSIONS.includes(extension);
  const hasValidMime = SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      reason: `Formato de imagen no compatible ("${file.type || extension}"). Usa JPEG, PNG o WebP.`,
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

  // Sanitizar caracteres conflictivos en sistemas de archivos
  const cleanBase = baseName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'imagen';

  return `${cleanBase}${suffix}.png`;
}

export function downloadBlob(blob: Blob, filename: string): { url: string; trigger: () => void } {
  const url = URL.createObjectURL(blob);

  const trigger = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ejecución automática inmediata
  try {
    trigger();
  } catch (err) {
    console.warn('Descarga automática bloqueada por el navegador:', err);
  }

  return { url, trigger };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
