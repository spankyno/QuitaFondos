/**
 * Modal / Vista "Acerca de..."
 * Información completa de la funcionalidad y stack tecnológico de la aplicación.
 */

import React, { useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Zap,
  Globe,
  Mail,
  User,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  // Cerrar al pulsar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-y-auto flex flex-col text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-zinc-900/95 border-b border-zinc-800/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h2 className="text-base font-semibold text-zinc-100">
              Acerca de la aplicación
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido principal */}
        <div className="p-6 sm:p-8 space-y-6 text-sm">
          {/* Introducción */}
          <div>
            <h3 className="text-xl font-semibold text-zinc-50 mb-2">
              Eliminador de Fondos con IA Local
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Herramienta web ultra-minimalista diseñada para eliminar automáticamente el fondo
              de imágenes fotográficas mediante inteligencia artificial ejecutada íntegramente
              en el navegador del usuario. Tus imágenes no se envían a ningún servidor.
            </p>
          </div>

          {/* Banner visual de la aplicación (og-image.png) */}
          <div className="w-full rounded-xl overflow-hidden border border-zinc-800/90 shadow-lg bg-zinc-950/80">
            <img
              src="/og-image.png"
              alt="Eliminador de Fondos con IA Local - QuitaFondos"
              className="w-full h-auto object-cover max-h-72 sm:max-h-80 transition-all hover:scale-[1.01]"
              loading="lazy"
            />
          </div>

          {/* Funcionalidades */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Funcionalidad principal</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-zinc-400 pl-6 list-disc marker:text-emerald-500">
              <li>
                <strong className="text-zinc-300">Flujo inmediato sin fricción:</strong> basta con arrastrar o pegar una imagen para iniciar el procesamiento y descargar automáticamente el archivo sin necesidad de clics manuales.
              </li>
              <li>
                <strong className="text-zinc-300">Recorte de alta precisión:</strong> segmentación de cabello, bordes complejos y objetos transparentes conservando la resolución original del sujeto.
              </li>
              <li>
                <strong className="text-zinc-300">Transparencia real:</strong> genera un archivo PNG con canal alfa genuino, sin fondos blancos simulados.
              </li>
              <li>
                <strong className="text-zinc-300">Fusión de nuevo fondo:</strong> permite colocar la imagen recortada sobre cualquier fotografía o fondo plano/degradado mediante Canvas API nativo.
              </li>
              <li>
                <strong className="text-zinc-300">Celebración con confeti:</strong> efecto festivo y accesible al finalizar cada descarga procesada.
              </li>
            </ul>
          </div>

          {/* Privacidad */}
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 text-emerald-300 font-medium mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Tus imágenes se quedan en tu dispositivo</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Tus fotografías nunca abandonan tu ordenador o teléfono. Todo el cálculo matricial, la inferencia neuronal y la composición se realizan en la memoria RAM y GPU local de tu propio dispositivo. El único dato que se recoge es tu dirección IP, mediante un contador de visitas propio del autor (Aitor Hub). No se usan cookies ni se almacena ninguna imagen.
            </p>
          </div>

          {/* Stack Tecnológico */}
          <div>
            <div className="flex items-center gap-2 text-zinc-200 font-medium mb-3">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Stack Tecnológico</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-3">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Modelo de IA
                </span>
                <span className="font-semibold text-zinc-200 block">
                  IS-Net (InSPyReNet)
                </span>
                <span className="text-zinc-400 text-[11px]">
                  Red neuronal profunda para segmentación saliente de alta fidelidad.
                </span>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-3">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Motor de Inferencia
                </span>
                <span className="font-semibold text-zinc-200 block">
                  ONNX Runtime Web
                </span>
                <span className="text-zinc-400 text-[11px]">
                  Aceleración WebGPU nativa con respaldo WebAssembly SIMD multihilo.
                </span>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-3">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Frontend & Lenguaje
                </span>
                <span className="font-semibold text-zinc-200 block">
                  React 19 + TypeScript
                </span>
                <span className="text-zinc-400 text-[11px]">
                  Desarrollado sobre Vite para una experiencia SPA reactiva y fluida.
                </span>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-3">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Estilos & Diseño
                </span>
                <span className="font-semibold text-zinc-200 block">
                  Tailwind CSS v4
                </span>
                <span className="text-zinc-400 text-[11px]">
                  Interfaz minimalista, modo oscuro y tipografía legible.
                </span>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-3">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Fusión Gráfica
                </span>
                <span className="font-semibold text-zinc-200 block">
                  HTML5 Canvas API
                </span>
                <span className="text-zinc-400 text-[11px]">
                  Composición de capas píxel a píxel con exportación directa a PNG.
                </span>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-3">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Alojamiento & Edge
                </span>
                <span className="font-semibold text-zinc-200 block">
                  Cloudflare Pages
                </span>
                <span className="text-zinc-400 text-[11px]">
                  Despliegue estático global con latencia mínima y alta disponibilidad.
                </span>
              </div>
            </div>
          </div>

          {/* Autor y Enlaces */}
          <div className="border-t border-zinc-800/80 pt-5">
            <div className="flex items-center gap-2 text-zinc-200 font-medium mb-3">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Sobre el autor</span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 mb-3">
              Desarrollado por <strong className="text-zinc-200">Aitor Sánchez Gutiérrez</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <a
                href="https://aitorsanchez.pages.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Blog personal</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>

              <a
                href="https://aitorhub.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Aitor Hub</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>

              <a
                href="https://aitorsanchez.pages.dev/contacto"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>Contacto</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="sticky bottom-0 px-6 py-4 bg-zinc-900/95 border-t border-zinc-800/80 backdrop-blur-md flex items-center justify-between text-xs text-zinc-400">
          <span>Aitor Sánchez Gutiérrez © 2026 Todos los derechos reservados.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
