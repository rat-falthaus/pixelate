import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { basePath } from "../site.config.mjs";

const outputDirectory = "dist";
const serviceWorkerPath = join(outputDirectory, "sw.js");
const manifestPath = join(outputDirectory, "precache-manifest.json");
const baseUrl = `${basePath.replace(/\/+$/, "")}/`;

async function findFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? findFiles(path) : [path];
    }),
  );
  return files.flat();
}

const files = (await findFiles(outputDirectory))
  .filter((path) => path !== serviceWorkerPath && path !== manifestPath)
  .sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(relative(outputDirectory, file).split(sep).join("/"));
  hash.update(await readFile(file));
}
const cacheName = `pixelate-${hash.digest("hex").slice(0, 16)}`;
const urls = [
  ...new Set([
    baseUrl,
    ...files.map((file) => `${baseUrl}${relative(outputDirectory, file).split(sep).join("/")}`),
  ]),
];

await writeFile(manifestPath, `${JSON.stringify(urls, null, 2)}\n`);
await writeFile(
  serviceWorkerPath,
  `const CACHE_NAME = '${cacheName}';
const BASE_URL = '${baseUrl}';
const PRECACHE_URLS = ${JSON.stringify(urls)};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('pixelate-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE_URL)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode !== 'navigate') {
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) return cached;
    }

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        const page = await cache.match(\`\${BASE_URL}index.html\`, { ignoreVary: true })
          ?? await cache.match(BASE_URL, { ignoreVary: true });
        if (page) return page;
      }
      throw error;
    }
  })());
});
`,
);
