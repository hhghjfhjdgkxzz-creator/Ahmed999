import test from 'node:test';
import assert from 'node:assert/strict';
import { AsyncMutex } from './storageService.ts';

test('AsyncMutex serializes concurrent updates without losing any mutation', async () => {
  const mutex = new AsyncMutex();
  let sharedCounter = 0;
  const orderLog: number[] = [];

  const tasks = Array.from({ length: 10 }, (_, idx) =>
    mutex.runExclusive(async () => {
      const current = sharedCounter;
      // Simulate variable async I/O delay
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
