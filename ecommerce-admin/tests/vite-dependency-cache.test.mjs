import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'vite';
import { createServer as createPortReservation } from 'node:net';

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('cold startup and lazy Store Builder imports keep React DOM in one cache generation', { timeout: 30_000 }, async t => {
  // Isolated dependency cache: never clear or overwrite the running dev server's cache.
  const cacheDir = await fs.mkdtemp(path.join(adminRoot, 'node_modules/.vite-react-test-'));
  let server;
  t.after(async () => {
    await server?.close();
    const resolved = await fs.realpath(cacheDir);
    assert.equal(path.dirname(resolved), await fs.realpath(path.join(adminRoot, 'node_modules')));
    assert.match(path.basename(resolved), /^\.vite-react-test-/);
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  // Vite treats port 0 as its default port, so reserve a concrete free port.
  const reservation = createPortReservation();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  assert.notEqual(port, 5173);
  server = await createServer({
    root: adminRoot,
    configFile: path.join(adminRoot, 'vite.config.js'),
    cacheDir,
    logLevel: 'error',
    server: { host: '127.0.0.1', port, strictPort: true, open: false }
  });
  await server.listen();
  const address = server.httpServer.address();
  const origin = 'http://127.0.0.1:' + address.port;
  const read = async url => {
    const response = await fetch(new URL(url, origin));
    assert.equal(response.status, 200, 'Expected valid module response: ' + url);
    return response.text();
  };
  const main = await read('/src/main.jsx');
  const clientUrl = main.match(/from ["']([^"']*react-dom_client\.js[^"']*)["']/)?.[1];
  assert.ok(clientUrl, 'Entry point must resolve the optimized React DOM client');
  const clientBefore = await read(clientUrl);
  const domUrl = clientBefore.match(/from ["']([^"']*\/react-dom\.js[^"']*)["']/)?.[1];
  assert.ok(domUrl, 'React DOM client must resolve its matching React DOM module');
  const domBefore = await read(domUrl);
  const metadataFile = path.join(cacheDir, 'deps/_metadata.json');
  const metadataBefore = JSON.parse(await fs.readFile(metadataFile, 'utf8'));

  // These are loaded later by the route, preview and gallery. Discovering them
  // must not rebuild React and change private interop exports under cached URLs.
  await read('/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');
  await read('/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx');
  await read('/src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx');
  await read('/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx');
  await delay(300);
  const metadataAfter = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
  assert.equal(metadataAfter.browserHash, metadataBefore.browserHash);
  assert.equal(await read(clientUrl), clientBefore);
  assert.equal(await read(domUrl), domBefore);

  // Native ESM linking also catches missing generated exports such as 't'.
  // It initializes the library only; it never mounts UI or contacts any API.
  const client = await import(pathToFileURL(path.join(cacheDir, 'deps/react-dom_client.js')).href);
  assert.equal(typeof client.default.createRoot, 'function');
  assert.equal(typeof client.default.hydrateRoot, 'function');
});
