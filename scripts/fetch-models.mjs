#!/usr/bin/env node
/**
 * Descarga el modelo IS-Net y el runtime WASM de @imgly/background-removal
 * a public/models/ para servirlos desde el propio dominio de la aplicación.
 *
 * Por qué: por defecto la librería los carga en tiempo de ejecución desde
 * staticimgly.com (código WASM incluido) y solo comprueba el tamaño de cada
 * fragmento, no su hash. Aquí se descargan en el build, se verifican contra
 * scripts/models.lock.json (SHA-256) y se publican junto a la app.
 *
 * Uso:
 *   node scripts/fetch-models.mjs                 # descarga/verifica (se salta si ya está)
 *   node scripts/fetch-models.mjs --update-lock   # regenera models.lock.json (tras subir de versión)
 *   node scripts/fetch-models.mjs --force         # vuelve a descargar
 *
 * Variables:
 *   MODELS_BASE_URL  origen alternativo (espejo propio). Debe terminar en "/".
 *   MODELS_STRICT=1  falla si no existe models.lock.json (recomendado en CI)
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'models');
const LOCK_FILE = path.join(ROOT, 'scripts', 'models.lock.json');
const MARKER = path.join(OUT_DIR, '.complete');

const args = new Set(process.argv.slice(2));
const UPDATE_LOCK = args.has('--update-lock');
const FORCE = args.has('--force') || UPDATE_LOCK;
const STRICT = process.env.MODELS_STRICT === '1';

// Recursos que la librería (v1.7.x) solicita realmente: modelo isnet_fp16 y
// el runtime ONNX para WebGPU (jsep) y WebAssembly.
const REQUIRED_KEYS = [
  '/models/isnet_fp16',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
];

const pkgPath = path.join(ROOT, 'node_modules', '@imgly', 'background-removal', 'package.json');
if (!existsSync(pkgPath)) {
  fail('No se encuentra @imgly/background-removal. Ejecuta "npm install" primero.');
}
const VERSION = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
const BASE_URL =
  process.env.MODELS_BASE_URL ||
  `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/dist/`;
if (!BASE_URL.endsWith('/')) fail('MODELS_BASE_URL debe terminar en "/".');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function fail(msg) {
  console.error(`\n[fetch-models] ERROR: ${msg}\n`);
  process.exit(1);
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function pool(items, limit, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) await worker(queue.shift());
    })
  );
}

const stamp = `${VERSION}|${BASE_URL}`;
if (!FORCE && existsSync(MARKER) && readFileSync(MARKER, 'utf8') === stamp) {
  console.log(`[fetch-models] public/models ya está listo (v${VERSION}).`);
  process.exit(0);
}

const lock = existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, 'utf8')) : null;
if (!lock && !UPDATE_LOCK) {
  if (STRICT) fail('Falta scripts/models.lock.json (MODELS_STRICT=1). Genera uno con --update-lock.');
  console.warn('[fetch-models] AVISO: no hay models.lock.json; se generará uno nuevo. Hazle commit.');
}
if (lock && lock.version !== VERSION && !UPDATE_LOCK) {
  fail(`models.lock.json es de la v${lock.version} y la librería instalada es la v${VERSION}. Usa --update-lock.`);
}

console.log(`[fetch-models] Descargando recursos v${VERSION} desde ${BASE_URL}`);
const resources = JSON.parse((await get(new URL('resources.json', BASE_URL))).toString('utf8'));

const selected = {};
for (const key of REQUIRED_KEYS) {
  if (!resources[key]) fail(`El origen no contiene el recurso requerido "${key}".`);
  selected[key] = resources[key];
}

const chunks = new Map(); // nombre -> tamaño esperado
for (const [key, entry] of Object.entries(selected)) {
  for (const c of entry.chunks) {
    if (!/^[A-Za-z0-9._-]+$/.test(c.name)) fail(`Nombre de fragmento no válido en ${key}: ${c.name}`);
    chunks.set(c.name, c.offsets[1] - c.offsets[0]);
  }
}

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const hashes = {};
let done = 0;
await pool([...chunks], 4, async ([name, size]) => {
  const data = await get(new URL(name, BASE_URL));
  if (data.length !== size) fail(`Tamaño inesperado en ${name}: esperado ${size}, recibido ${data.length}.`);
  const digest = sha256(data);
  if (lock && !UPDATE_LOCK) {
    if (!lock.chunks[name]) fail(`El fragmento ${name} no está en models.lock.json.`);
    if (lock.chunks[name] !== digest) fail(`Hash distinto en ${name}: el origen ha cambiado o está comprometido.`);
  }
  hashes[name] = digest;
  await writeFile(path.join(OUT_DIR, name), data);
  process.stdout.write(`\r[fetch-models] ${++done}/${chunks.size} fragmentos`);
});
process.stdout.write('\n');

// resources.json reducido: solo lo que la aplicación usa.
await writeFile(path.join(OUT_DIR, 'resources.json'), JSON.stringify(selected));

if (UPDATE_LOCK || !lock) {
  const sorted = Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(LOCK_FILE, JSON.stringify({ version: VERSION, chunks: sorted }, null, 2) + '\n');
  console.log('[fetch-models] models.lock.json actualizado.');
}

await writeFile(MARKER, stamp);
console.log(`[fetch-models] Listo: ${chunks.size} fragmentos verificados en public/models/.`);
