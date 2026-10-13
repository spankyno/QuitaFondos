# Eliminador de Fondos con IA Local en Navegador

Aplicación web minimalista para eliminar fondos de imágenes y fusionar fondos mediante Inteligencia Artificial ejecutada 100% de forma local en el navegador del usuario.

Tus imágenes no se envían a ningún servidor y no se usan APIs comerciales de pago.

### Privacidad

- **Imágenes**: se procesan íntegramente en el dispositivo del usuario; nunca se suben ni se almacenan.
- **Único dato recogido**: la **dirección IP** del visitante, mediante un contador de visitas propio del autor (Aitor Hub, `tracker.js`). No se usan cookies.
- **Modelo y runtime**: se sirven desde el propio dominio (`/models/`), no desde CDN de terceros (ver sección 4).
- La IP es un dato personal según el RGPD: si despliegas tu propia instancia con este contador, menciónalo en tu aviso de privacidad.

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
3. **Modelo y runtime en tu propio dominio**: `npm run build` (y `npm run dev`) ejecutan antes `scripts/fetch-models.mjs`, que descarga el modelo `isnet_fp16` y el runtime ONNX a `public/models/` y **verifica el SHA-256 de cada fragmento** contra `scripts/models.lock.json`. Si algo no coincide, el build falla.
   - La primera vez (o al subir la versión de `@imgly/background-removal`) ejecuta `npm run fetch-models -- --update-lock` y haz commit de `scripts/models.lock.json`.
   - En Cloudflare Pages define `MODELS_STRICT=1` para que el build falle si falta el lock.
4. **Lockfile**: se versiona `package-lock.json` y se instala con `npm ci`. Si aparece `Missing: @tailwindcss/oxide-... from lock file`, regenera el lock con `rm -rf node_modules package-lock.json && npm install` (el lock incluye los binarios opcionales de todas las plataformas). `bun.lock` está ignorado porque Cloudflare lo detecta y falla.
   - En Cloudflare Pages (*Settings > Environment variables*): `NODE_VERSION=20` (o `22`) y `MODELS_STRICT=1`.
   - Revisa dependencias con `npm run audit`.
5. **Cabeceras de seguridad**: `public/_headers` incluye una CSP completa en modo *Report-Only*. Tras comprobar en la consola que no hay infracciones, pásala a `Content-Security-Policy`.
6. Despliega en el plan gratuito de Cloudflare Pages.

---

## 5. Modelo de Inteligencia Artificial Utilizado

- **Modelo**: **IS-Net (InSPyReNet - Intelligent Scalable Object/Person Matting)** optimizado en formato ONNX (`isnet_fp16`).
- **Motor de inferencia**: **ONNX Runtime Web** (`@imgly/background-removal`).
- **Aceleración**: WebGPU (prioritaria en navegadores y hardware compatibles) con conmutación automática y transparente a WebAssembly SIMD multihilo en caso de falta de soporte de GPU.

---

## 6. Licencia del Modelo y Bibliotecas

- **IS-Net / @imgly/background-removal**: Código libre bajo licencia **AGPL-3.0**.
- **ONNX Runtime Web**: Licencia **MIT** (Microsoft).

---

## 7. Tamaño Aproximado de Descarga

- **Pesos del modelo neuronal**: ~40 MB a ~80 MB (se descargan desde tu propio dominio una única vez y quedan en la caché del navegador).
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
