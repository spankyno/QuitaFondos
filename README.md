# Eliminador de Fondos con IA Local en Navegador

Aplicación web minimalista para eliminar fondos de imágenes y fusionar fondos mediante Inteligencia Artificial ejecutada 100% de forma local en el navegador del usuario.

Sin envíos de imágenes a servidores externos, sin registros, sin APIs comerciales de pago y con total privacidad.

---

## 1. Instalación

Requiere Node.js 18+ (recomendado Node.js 20 o 22) y npm:

```bash
npm install
```

---

## 2. Ejecución Local (Desarrollo)

Para iniciar el servidor de desarrollo local con Vite:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## 3. Compilación

Para generar los archivos estáticos de producción:

```bash
npm run build
```

El resultado compilado se guardará en la carpeta `dist/`.

---

## 4. Despliegue en Cloudflare Pages

La aplicación es completamente estática (Single Page Application):

1. Conecta tu repositorio Git a **Cloudflare Pages**.
2. Parámetros de compilación recomendados:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. **Despliegue sin errores de lockfile en Cloudflare Pages**:
   - Para evitar errores de incompatibilidad entre sistemas operativos (`Missing: @tailwindcss/oxide-darwin... from lock file` con `npm ci` o `Unknown lockfile version` con `bun`), se ha configurado el proyecto para que Cloudflare Pages instale directamente mediante `npm install` sin depender de archivos de bloqueo específicos de una sola plataforma.
   - En tu repositorio local ejecuta:
     ```bash
     git rm package-lock.json bun.lock
     git commit -m "fix: use dynamic npm install for cloudflare pages"
     git push
     ```
   - En Cloudflare Pages (*Settings > Environment variables*), se recomienda configurar:
     - `NODE_VERSION=20` (o `22`)
4. Despliega en el plan gratuito de Cloudflare Pages.

---

## 5. Modelo de Inteligencia Artificial Utilizado

- **Modelo**: **IS-Net (InSPyReNet - Intelligent Scalable Object/Person Matting)** optimizado en formato ONNX (`isnet_fp16` / `isnet_quint8`).
- **Motor de inferencia**: **ONNX Runtime Web** (`@imgly/background-removal`).
- **Aceleración**: WebGPU (prioritaria en navegadores y hardware compatibles) con conmutación automática y transparente a WebAssembly SIMD multihilo en caso de falta de soporte de GPU.

---

## 6. Licencia del Modelo y Bibliotecas

- **IS-Net / @imgly/background-removal**: Código libre bajo licencia **AGPL-3.0**.
- **ONNX Runtime Web**: Licencia **MIT** (Microsoft).

---

## 7. Tamaño Aproximado de Descarga

- **Pesos del modelo neuronal**: ~40 MB a ~80 MB (se descargan una única vez y quedan almacenados en la caché del navegador para usos posteriores inmediatos).
- **Runtime WebAssembly / WebGPU**: ~5 MB a ~10 MB.
- **Bundle JavaScript de la aplicación**: < 150 KB gzipped.

---

## 8. Compatibilidad y Limitaciones Conocidas

- **Navegadores compatibles**:
  - Google Chrome / Chromium 113+ (aceleración completa WebGPU y WebAssembly SIMD).
  - Microsoft Edge 113+ (aceleración completa WebGPU y WebAssembly SIMD).
  - Mozilla Firefox 115+ (WebAssembly SIMD; soporte WebGPU experimental).
  - Apple Safari 16.4+ en macOS e iOS (WebAssembly SIMD; WebGPU disponible en macOS Sonoma+ y Safari 17+).
- **Memoria RAM**: Se recomienda un dispositivo con al menos 4 GB de memoria RAM libre para procesar imágenes fotográficas de alta resolución sin saturar la pestaña.
- **Formatos admitidos**: JPEG, JPG, PNG y WebP.
- **Descargas automáticas**: Si el navegador bloquea las descargas automáticas por política de pop-ups o permisos, la interfaz ofrece un botón de descarga manual para guardar el archivo con un clic.
