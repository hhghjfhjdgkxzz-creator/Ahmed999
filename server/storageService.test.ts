import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AsyncMutex,
  storeAssetBuffer,
  readCatalogIndex,
  mutateCatalogSafe,
  ensureStorageDirectories,
} from './storageService.ts';

test('AsyncMutex serializes concurrent updates without losing any mutation', async () => {
  const mutex = new AsyncMutex();
  let sharedCounter = 0;
  const orderLog: number[] = [];

  const tasks = Array.from({ length: 10 }, (_, idx) =>
    mutex.runExclusive(async () => {
      const current = sharedCounter;
      await new Promise((r) => setTimeout(r, Math.random() * 15));
      sharedCounter = current + 1;
      orderLog.push(idx);
      return sharedCounter;
    })
  );

  const results = await Promise.all(tasks);
  assert.equal(sharedCounter, 10);
  assert.deepEqual(results, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(orderLog.length, 10);
});

test('storeAssetBuffer saves assets directly into public/gifts folder with web-friendly url', async () => {
  await ensureStorageDirectories();
  const sampleData = Buffer.from('TEST_GIFT_ASSET_CONTENT_123', 'utf8');
  const result = await storeAssetBuffer({
    folder: 'originals',
    originalFilename: 'unit_test_crown.svg',
    buffer: sampleData,
    contentType: 'image/svg+xml',
  });

  assert.ok(result.publicUrl.startsWith('/gifts/originals/'), 'publicUrl must point to /gifts/ path');
  assert.ok(result.storageKey.startsWith('gifts/originals/'));
  assert.equal(result.sizeBytes, sampleData.byteLength);

  // Verify file was physically written to public/gifts/originals
  const publicPath = path.join(process.cwd(), 'public', result.storageKey);
  const diskContent = await fs.readFile(publicPath, 'utf8');
  assert.equal(diskContent, 'TEST_GIFT_ASSET_CONTENT_123');

  // Clean up
  await fs.unlink(publicPath).catch(() => {});
});

test('readCatalogIndex reads catalog and ensures persisted gifts exist', async () => {
  const catalog = await readCatalogIndex();
  assert.ok(catalog.version >= 1);
  assert.ok(Array.isArray(catalog.items));
  assert.ok(catalog.items.length > 0, 'Catalog must contain items');

  // Verify at least one item has a valid format and name
  const first = catalog.items[0];
  assert.ok(first.id);
  assert.ok(first.name);
  assert.ok(first.format);
});
