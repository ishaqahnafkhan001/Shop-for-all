import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { watchStorefrontPackages } from '../vite.config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const renderer = path.join(root, 'packages/storefront-renderer');
const theme = path.join(root, 'packages/storefront-theme');

function setup(t, restart = async () => {}) {
  const watcher = new EventEmitter();
  const httpServer = new EventEmitter();
  const watched = [];
  const errors = [];
  const restarts = [];
  watcher.add = paths => watched.push(...paths);
  watchStorefrontPackages().configureServer({
    watcher,
    httpServer,
    restart: async force => { restarts.push(force); await restart(); },
    config: { logger: { error: message => errors.push(message) } }
  });
  t.after(() => httpServer.emit('close'));
  return { watcher, httpServer, watched, errors, restarts };
}

test('watches both real package directories behind node_modules junctions', t => {
  const { watched } = setup(t);
  assert.deepEqual(watched, [renderer, theme]);
});

test('source edits refresh transformed modules and force optimized dependencies to rebuild', async t => {
  const { watcher, restarts } = setup(t);
  watcher.emit('all', 'change', path.join(renderer, 'presentation/CheckoutSections.jsx'));
  watcher.emit('all', 'change', path.join(renderer, 'normalizeProduct.js'));
  watcher.emit('all', 'change', path.join(theme, 'index.cjs'));
  watcher.emit('all', 'change', path.join(theme, 'index.mjs'));
  watcher.emit('all', 'change', path.join(renderer, 'styles.css'));
  await delay(150);
  assert.deepEqual(restarts, [true], 'A burst of shared edits causes one forced restart');
});

test('new modules, removed modules and manifest changes also refresh the server', async t => {
  const { watcher, restarts } = setup(t);
  for (const [event, file] of [
    ['add', path.join(renderer, 'viewports.js')],
    ['unlink', path.join(renderer, 'presentation/Retired.jsx')],
    ['change', path.join(theme, 'package.json')]
  ]) {
    watcher.emit('all', event, file);
    await delay(150);
  }
  assert.deepEqual(restarts, [true, true, true]);
});

test('ignores unrelated and neighboring paths and non-source changes', async t => {
  const { watcher, restarts } = setup(t);
  for (const file of [
    path.join(root, 'ecommerce-backend/backend/app.js'),
    path.join(root, 'ecommerce-admin/src/App.jsx'),
    path.join(root, 'packages/storefront-renderer-other/index.js'),
    path.join(renderer, '../private/index.js'),
    path.join(renderer, 'fonts/DM-Sans-OFL.txt')
  ]) watcher.emit('all', 'change', file);
  watcher.emit('all', 'addDir', path.join(renderer, 'new-directory.js'));
  await delay(150);
  assert.deepEqual(restarts, []);
});

test('logs restart failures without an unhandled rejection', async t => {
  const { watcher, errors } = setup(t, async () => { throw new Error('Restart failed'); });
  watcher.emit('all', 'change', path.join(renderer, 'presentation/CheckoutSections.jsx'));
  await delay(150);
  assert.deepEqual(errors, ['Restart failed']);
});

test('closing the server cancels pending work and removes its change listener', async t => {
  const { watcher, httpServer, restarts } = setup(t);
  watcher.emit('all', 'change', path.join(renderer, 'presentation/CheckoutSections.jsx'));
  httpServer.emit('close');
  assert.equal(watcher.listenerCount('all'), 0);
  await delay(150);
  assert.deepEqual(restarts, []);
});
