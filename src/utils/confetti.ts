/**
 * Animación de confeti al completar la descarga de imágenes procesadas.
 * Respeta 'prefers-reduced-motion' para accesibilidad.
 */

import confetti from 'canvas-confetti';

export function triggerCelebrationConfetti() {
  // Ráfaga central principal
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.62 },
    colors: ['#10b981', '#34d399', '#6ee7b7', '#f8fafc', '#38bdf8', '#fbbf24'],
    disableForReducedMotion: true,
  });

  // Pequeñas ráfagas laterales sutiles
  setTimeout(() => {
    confetti({
      particleCount: 30,
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.65 },
      colors: ['#10b981', '#34d399', '#f8fafc'],
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 30,
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.65 },
      colors: ['#10b981', '#34d399', '#f8fafc'],
      disableForReducedMotion: true,
    });
  }, 150);
}
