/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Download,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  removeBackgroundLocally,
  checkWebGpuSupport,
  type AIProgressInfo,
} from './utils/aiBackgroundRemoval';
import {
  mergeImagesWithCanvas,
  createPresetBackgroundBlob,
} from './utils/canvasComposition';
import {
  validateImageFile,
  generateOutputFilename,
  downloadBlob,
  formatFileSize,
} from './utils/fileHelpers';
import { triggerCelebrationConfetti } from './utils/confetti';
import { AboutModal } from './components/AboutModal';

type AppState =
  | 'idle'
  | 'loading-model'
  | 'processing'
  | 'transparent-ready'
  | 'compositing'
  | 'composite-ready'
  | 'error';

interface ProcessedData {
  originalFile: File | null;
  originalUrl: string | null;
  originalFilename: string;
  transparentBlob: Blob | null;
  transparentUrl: string | null;
  transparentFilename: string;
  compositeBlob: Blob | null;
  compositeUrl: string | null;
  compositeFilename: string;
}

const EMPTY_DATA: ProcessedData = {
  originalFile: null,
  originalUrl: null,
  originalFilename: 'imagen.png',
  transparentBlob: null,
  transparentUrl: null,
  transparentFilename: 'imagen_sin_fondo.png',
  compositeBlob: null,
  compositeUrl: null,
  compositeFilename: 'imagen_con_fondo.png',
};

function revokeDataUrls(d: ProcessedData) {
  if (d.originalUrl) URL.revokeObjectURL(d.originalUrl);
  if (d.transparentUrl) URL.revokeObjectURL(d.transparentUrl);
  if (d.compositeUrl) URL.revokeObjectURL(d.compositeUrl);
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [progressInfo, setProgressInfo] = useState<AIProgressInfo>({
    phase: 'idle',
    percent: undefined,
    message: '',
    backend: 'WebAssembly',
  });
  const [hardwareInfo, setHardwareInfo] = useState<string>('Detectando hardware...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Datos de las imágenes procesadas
  const [data, setData] = useState<ProcessedData>(EMPTY_DATA);

  // Referencias para liberar object URLs y evitar procesados simultáneos
  const dataRef = useRef<ProcessedData>(data);
  dataRef.current = data;
  const busyRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Detección de aceleración por hardware
  useEffect(() => {
    checkWebGpuSupport().then((hasGpu) => {
      setHardwareInfo(hasGpu ? 'Aceleración WebGPU activa' : 'Aceleración WebAssembly SIMD');
    });
  }, []);

  // Limpieza de URLs creadas al desmontar o resetear
  const cleanUrls = useCallback(() => revokeDataUrls(dataRef.current), []);

  useEffect(() => () => revokeDataUrls(dataRef.current), []);

  // Mostrar mensaje temporal discreto
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Procesar imagen original y eliminar fondo
  const processOriginalImage = async (file: File) => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const validation = await validateImageFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.reason || 'Archivo no válido.');
        setAppState('error');
        return;
      }

      setErrorMessage(null);

      // Liberar las URLs de una imagen anterior y partir de un estado limpio
      revokeDataUrls(dataRef.current);
      const originalUrl = URL.createObjectURL(file);
      const transparentFilename = generateOutputFilename(file.name, '_sin_fondo');

      setData({
        ...EMPTY_DATA,
        originalFile: file,
        originalUrl,
        originalFilename: file.name,
        transparentFilename,
      });

      setAppState('loading-model');

      await runBackgroundRemoval(file, transparentFilename);
    } finally {
      busyRef.current = false;
    }
  };

  const runBackgroundRemoval = async (file: File, transparentFilename: string) => {
    try {
      const transparentBlob = await removeBackgroundLocally(file, (info) => {
        setProgressInfo(info);
        if (info.phase === 'processing') {
          setAppState('processing');
        } else if (info.phase === 'loading') {
          setAppState('loading-model');
        }
      });

      const transparentUrl = URL.createObjectURL(transparentBlob);

      setData((prev) => ({
        ...prev,
        transparentBlob,
        transparentUrl,
      }));

      // Paso 5: Descarga automática inmediata y celebración
      downloadBlob(transparentBlob, transparentFilename);
      triggerCelebrationConfetti();
      showToast('Imagen procesada. Descarga iniciada.');

      // Paso 11: Mostrar pantalla con opción «¿Quieres añadir otro fondo?»
      setAppState('transparent-ready');
    } catch (err: any) {
      console.error('Error durante la inferencia local:', err);
      // Mensaje genérico: el detalle técnico queda solo en la consola
      setErrorMessage(
        'No se pudo procesar la imagen. Verifica que el archivo no esté dañado e inténtalo de nuevo.'
      );
      setAppState('error');
    }
  };

  // Procesar y fusionar con imagen de fondo
  const processBackgroundComposite = async (bgSource: File | Blob) => {
    if (!data.transparentBlob) return;

    if (bgSource instanceof File) {
      const validation = await validateImageFile(bgSource);
      if (!validation.valid) {
        showToast(validation.reason || 'Formato de fondo no válido.');
        return;
      }
    }

    setAppState('compositing');

    try {
      const compositeBlob = await mergeImagesWithCanvas(data.transparentBlob, bgSource);
      const compositeUrl = URL.createObjectURL(compositeBlob);
      const compositeFilename = generateOutputFilename(data.originalFilename, '_con_fondo');

      // Si ya había un resultado anterior, liberar su URL
      const previousCompositeUrl = dataRef.current.compositeUrl;

      setData((prev) => ({
        ...prev,
        compositeBlob,
        compositeUrl,
        compositeFilename,
      }));

      if (previousCompositeUrl) URL.revokeObjectURL(previousCompositeUrl);

      // Descarga automática del resultado fusionado y celebración
      downloadBlob(compositeBlob, compositeFilename);
      triggerCelebrationConfetti();
      showToast('Fondo aplicado. Descarga iniciada.');

      setAppState('composite-ready');
    } catch (err: any) {
      console.error('Error durante la composición:', err);
      showToast('Ocurrió un error al fusionar el fondo. Conservamos el recorte original.');
      setAppState('transparent-ready');
    }
  };

  // Drag and drop handlers para imagen principal
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processOriginalImage(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processOriginalImage(file);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  // Drag and drop para imagen de fondo
  const handleBgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processBackgroundComposite(file);
    }
  };

  const handleBgInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processBackgroundComposite(file);
    }
    e.target.value = '';
  };

  // Pegar con teclado (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (appState !== 'idle' && appState !== 'error') return;
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          processOriginalImage(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [appState]);

  // Reiniciar estado para procesar otra imagen
  const handleReset = () => {
    cleanUrls();
    setData(EMPTY_DATA);
    setAppState('idle');
    setErrorMessage(null);
    setToastMessage(null);
  };

  // Fondos predeterminados rápidos
  const applyPresetBackground = async (type: 'white' | 'dark' | 'studio' | 'sunset' | 'nature') => {
    try {
      const presetBlob = await createPresetBackgroundBlob(type);
      await processBackgroundComposite(presetBlob);
    } catch (err) {
      console.error('Error con fondo predeterminado:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-between selection:bg-zinc-800 selection:text-white font-sans antialiased">
      {/* Toast discreto de notificación */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/90 text-zinc-100 text-sm font-medium border border-zinc-700/60 rounded-xl shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabecera minimalista y discreta */}
      <header className="w-full max-w-4xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-medium tracking-wider text-zinc-400 uppercase">
            IA Local en Navegador
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>{hardwareInfo}</span>
        </div>
      </header>

      {/* Contenedor principal central */}
      <main className="w-full max-w-2xl mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
        {/* ============================================================== */}
        {/* ESTADO 1: INICIAL (Idle)                                      */}
        {/* ============================================================== */}
        {appState === 'idle' && (
          <div className="w-full flex flex-col items-center text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50 mb-3">
              Eliminar fondo de imágenes
            </h1>
            <p className="text-base text-zinc-400 mb-8 max-w-md">
              Arrastra una imagen aquí o pulsa para seleccionarla.
            </p>

            {/* Zona grande de arrastre */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full aspect-[4/3] sm:aspect-[16/10] max-h-[380px] rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-8 cursor-pointer relative overflow-hidden group ${
                isDragOver
                  ? 'border-zinc-300 bg-zinc-800/60 scale-[1.01]'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-5 text-zinc-300 group-hover:text-white group-hover:scale-105 transition-all shadow-sm">
                <Upload className="w-7 h-7 stroke-[1.75]" />
              </div>

              <span className="text-base font-medium text-zinc-200 mb-1.5">
                Seleccionar fotografía
              </span>
              <span className="text-xs text-zinc-400">
                JPEG, PNG o WebP · Sin límite de resolución
              </span>
            </div>

            {/* Indicación discreta de privacidad */}
            <div className="mt-8 flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400/80 shrink-0" />
              <span>Procesamiento privado en tu dispositivo.</span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTADO 2: CARGA DEL MODELO O PROCESAMIENTO                     */}
        {/* ============================================================== */}
        {(appState === 'loading-model' || appState === 'processing') && (
          <div className="w-full flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 mb-3">
              Eliminar fondo de imágenes
            </h1>

            <div className="w-full aspect-[4/3] sm:aspect-[16/10] max-h-[380px] rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
              {/* Vista previa atenuada de la imagen que se procesa */}
              {data.originalUrl && (
                <div className="absolute inset-0 opacity-15 overflow-hidden filter blur-[2px]">
                  <img
                    src={data.originalUrl}
                    alt="Procesando"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Indicador de actividad discreto */}
              <div className="relative z-10 flex flex-col items-center max-w-sm px-4">
                <div className="relative mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-zinc-200 shadow-lg">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 stroke-[2]" />
                  </div>
                </div>

                <h2 className="text-lg font-medium text-zinc-100 mb-2">
                  {appState === 'loading-model'
                    ? 'Preparando el motor de inteligencia artificial…'
                    : 'Eliminando el fondo…'}
                </h2>

                <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                  {appState === 'loading-model'
                    ? progressInfo.percent !== undefined
                      ? `Cargando pesos neuronales (${progressInfo.percent}%)`
                      : 'Inicializando aceleración local en tu dispositivo…'
                    : 'Segmentando sujeto, contornos finos y cabello…'}
                </p>

                {/* Barra de progreso sutil si hay porcentaje */}
                {progressInfo.percent !== undefined && (
                  <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50 mb-2">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressInfo.percent}%` }}
                    />
                  </div>
                )}

                <span className="text-[11px] text-zinc-400 font-mono">
                  {data.originalFilename}
                </span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400/80" />
              <span>Procesamiento privado en tu dispositivo.</span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTADO 3: RECORTE TRANSPARENTE LISTO (¿Añadir otro fondo?)      */}
        {/* ============================================================== */}
        {appState === 'transparent-ready' && (
          <div className="w-full flex flex-col items-center">
            {/* Mensaje principal de confirmación */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 mb-1.5">
                ¿Quieres añadir otro fondo?
              </h1>
              <p className="text-sm text-zinc-400">
                La imagen sin fondo se descargó automáticamente.
              </p>
            </div>

            {/* Vista previa del recorte con fondo de cuadrícula transparente */}
            <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-6">
              <div className="w-full h-52 sm:h-64 rounded-xl overflow-hidden bg-checkerboard flex items-center justify-center relative shadow-inner">
                {data.transparentUrl && (
                  <img
                    src={data.transparentUrl}
                    alt="Recorte transparente"
                    className="max-h-full max-w-full object-contain drop-shadow-md"
                  />
                )}

                {/* Botón flotante para descargar manualmente por si el navegador bloqueó la descarga automática */}
                {data.transparentUrl && (
                  <a
                    href={data.transparentUrl}
                    download={data.transparentFilename}
                    onClick={() => triggerCelebrationConfetti()}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/85 hover:bg-zinc-950 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700/70 shadow-md backdrop-blur-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar de nuevo</span>
                  </a>
                )}
              </div>
            </div>

            {/* Zona para arrastrar o seleccionar imagen de fondo */}
            <div
              onClick={() => bgInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleBgDrop}
              className={`w-full rounded-2xl border-2 border-dashed transition-all duration-200 p-6 flex flex-col items-center justify-center cursor-pointer mb-5 text-center ${
                isDragOver
                  ? 'border-zinc-300 bg-zinc-800/60 scale-[1.01]'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60'
              }`}
            >
              <input
                ref={bgInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleBgInputChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3 text-zinc-300">
                <ImageIcon className="w-6 h-6 stroke-[1.75]" />
              </div>

              <span className="text-sm font-medium text-zinc-200 mb-1">
                Arrastra una imagen de fondo aquí
              </span>
              <span className="text-xs text-zinc-400">
                O pulsa para seleccionar una imagen
              </span>
            </div>

            {/* Opciones rápidas de fondos limpios para probar con un clic */}
            <div className="w-full flex items-center justify-center gap-2 mb-6 flex-wrap">
              <span className="text-xs text-zinc-400 mr-1">Fondos rápidos:</span>
              <button
                onClick={() => applyPresetBackground('white')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                Blanco puro
              </button>
              <button
                onClick={() => applyPresetBackground('studio')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-300 text-zinc-900 hover:bg-zinc-200 transition-colors"
              >
                Estudio gris
              </button>
              <button
                onClick={() => applyPresetBackground('dark')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700/60"
              >
                Negro mate
              </button>
              <button
                onClick={() => applyPresetBackground('sunset')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-orange-400 to-indigo-500 text-white hover:opacity-90 transition-opacity"
              >
                Gradiente
              </button>
            </div>

            {/* Opción discreta: Empezar de nuevo */}
            <button
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4 transition-colors"
            >
              Empezar de nuevo con otra imagen
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTADO 4: FUSIONANDO FONDO (Compositing)                       */}
        {/* ============================================================== */}
        {appState === 'compositing' && (
          <div className="w-full flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 mb-3">
              Fusionando imágenes…
            </h1>
            <div className="w-full aspect-[4/3] sm:aspect-[16/10] max-h-[380px] rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center p-8">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-4" />
              <p className="text-sm text-zinc-300">
                Componiendo con Canvas API y preparando descarga…
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTADO 5: COMPOSICIÓN COMPLETADA                               */}
        {/* ============================================================== */}
        {appState === 'composite-ready' && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 mb-1.5">
                Composición completada
              </h1>
              <p className="text-sm text-zinc-400">
                La imagen fusionada se ha descargado automáticamente.
              </p>
            </div>

            {/* Vista previa del resultado fusionado */}
            <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 mb-6">
              <div className="w-full h-56 sm:h-72 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center relative shadow-lg">
                {data.compositeUrl && (
                  <img
                    src={data.compositeUrl}
                    alt="Resultado con nuevo fondo"
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Acciones principales */}
            <div className="w-full flex items-center justify-center gap-3 mb-6">
              {data.compositeUrl && (
                <a
                  href={data.compositeUrl}
                  download={data.compositeFilename}
                  onClick={() => triggerCelebrationConfetti()}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar de nuevo</span>
                </a>
              )}

              <button
                onClick={() => setAppState('transparent-ready')}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700/60 transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Probar otro fondo</span>
              </button>
            </div>

            {/* Empezar de nuevo */}
            <button
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4 transition-colors"
            >
              Empezar de nuevo con otra imagen
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* ESTADO 6: ERROR                                                */}
        {/* ============================================================== */}
        {appState === 'error' && (
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 mb-4 shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-semibold text-zinc-100 mb-2">
              No se pudo procesar la imagen
            </h2>

            <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
              {errorMessage ||
                'Ocurrió un error inesperado al procesar el archivo. Prueba con una imagen en formato JPEG, PNG o WebP.'}
            </p>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-medium rounded-xl shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Seleccionar otra imagen</span>
            </button>
          </div>
        )}
      </main>

      {/* Pie de página con enlaces y derechos de autor */}
      <footer className="w-full max-w-4xl mx-auto px-6 py-6 border-t border-zinc-900 flex flex-col gap-3 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="text-zinc-300 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
            >
              Acerca de...
            </button>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <a
              href="https://aitorsanchez.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-200 transition-colors"
            >
              Blog
            </a>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <a
              href="https://aitorhub.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-200 transition-colors"
            >
              Aitor Hub
            </a>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <a
              href="https://aitorsanchez.pages.dev/contacto"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-200 transition-colors"
            >
              Contacto
            </a>
          </div>

          <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
            <span>Inferencia 100% on-device</span>
            <span aria-hidden="true">·</span>
            <span>ONNX Runtime Web + IS-Net</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-zinc-900/60 text-[11px] text-zinc-500 gap-1.5">
          <span>Autor: Aitor Sánchez Gutiérrez © 2026 Todos los derechos reservados.</span>
          <span>Procesamiento privado en tu dispositivo</span>
        </div>
      </footer>

      {/* Modal / Página Acerca de... */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
