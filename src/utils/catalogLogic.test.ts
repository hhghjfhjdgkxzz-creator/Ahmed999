import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectGiftFormat,
  sanitizeStorageFileName,
  formatBytes,
  filterAndSortGifts,
  computeCatalogStats,
  normalizePasswordString,
  type GiftItem,
} from './catalogLogic.ts';

test('normalizePasswordString converts Arabic-Indic digits to ASCII digits', () => {
  assert.equal(normalizePasswordString('١٥٠١٥٠'), '150150');
  assert.equal(normalizePasswordString('١٥٠ ١٥٠'), '150 150');
  assert.equal(normalizePasswordString(' 150150 '), '150150');
});

test('detectGiftFormat identifies supported formats accurately and rejects unsupported extensions', () => {
  assert.equal(detectGiftFormat('royal_dragon.svga'), 'SVGA');
  assert.equal(detectGiftFormat('LUXURY_CAR.VAP'), 'VAP');
  assert.equal(detectGiftFormat('party_effect.mp4'), 'MP4');
  assert.equal(detectGiftFormat('alpha_glow.webm'), 'WebM');
  assert.equal(detectGiftFormat('sparkle_crown.json'), 'Lottie');
  assert.equal(detectGiftFormat('avatar_ring.apng'), 'APNG');
  assert.equal(detectGiftFormat('badge.svg'), 'SVG');
  assert.equal(detectGiftFormat('sequence_bundle.zip'), 'ZIP');
  assert.equal(detectGiftFormat('malicious.exe'), null);
  assert.equal(detectGiftFormat('script.sh'), null);
});

test('sanitizeStorageFileName strips path traversal and unsafe characters while keeping extension', () => {
  assert.equal(sanitizeStorageFileName('../../etc/passwd.svga'), 'passwd.svga');
  assert.equal(sanitizeStorageFileName('C:\\Users\\Admin\\royal crown 2026!.mp4'), 'royal_crown_2026.mp4');
  assert.equal(sanitizeStorageFileName('___gift___.json'), 'gift.json');
});

test('formatBytes formats byte counts with tabular precision', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.00 KB');
  assert.equal(formatBytes(1048576 * 4.5), '4.50 MB');
});

const sampleGifts: GiftItem[] = [
  {
    id: 'gift-1',
    name: 'تنين الإمبراطور الذهبي',
    category: 'entrances',
    description: 'دخولية ملكية ثلاثية الأبعاد مع زئير التنين ومؤثرات النار الذهبية',
    originalUrl: '/demo/dragon.svg',
    thumbnailUrl: '/demo/dragon-thumb.svg',
    format: 'SVGA',
    sizeBytes: 4_500_000,
    hasAudio: true,
    hasAlpha: true,
    isAnimated: true,
    displayOrder: 2,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'gift-2',
    name: 'إطار التاج البنفسجي VIP',
    category: 'frames',
    description: 'إطار مايك متحرك لكبار الشخصيات',
    originalUrl: '/demo/crown.json',
    thumbnailUrl: '/demo/crown-thumb.svg',
    format: 'Lottie',
    sizeBytes: 120_000,
    hasAudio: false,
    hasAlpha: true,
    isAnimated: true,
    displayOrder: 1,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-16T12:00:00.000Z',
    updatedAt: '2026-10-16T12:00:00.000Z',
  },
  {
    id: 'gift-3',
    name: 'هدية مسودة غير منشورة',
    category: 'gifts',
    description: 'قيد المراجعة',
    originalUrl: '/demo/draft.mp4',
    thumbnailUrl: '/demo/draft-thumb.svg',
    format: 'MP4',
    sizeBytes: 8_000_000,
    hasAudio: true,
    hasAlpha: false,
    isAnimated: true,
    displayOrder: 3,
    published: false,
    allowDownload: false,
    uploadedAt: '2026-10-17T01:00:00.000Z',
    updatedAt: '2026-10-17T01:00:00.000Z',
  },
];

test('filterAndSortGifts filters unpublished items for public gallery and sorts by displayOrder', () => {
  const publicItems = filterAndSortGifts(sampleGifts, { includeUnpublished: false, sortBy: 'order' });
  assert.equal(publicItems.length, 2);
  assert.equal(publicItems[0].id, 'gift-2'); // displayOrder 1
  assert.equal(publicItems[1].id, 'gift-1'); // displayOrder 2

  const adminItems = filterAndSortGifts(sampleGifts, { includeUnpublished: true, sortBy: 'size_desc' });
  assert.equal(adminItems.length, 3);
  assert.equal(adminItems[0].id, 'gift-3'); // 8 MB
});

test('filterAndSortGifts filters by category, format, and Arabic search query', () => {
  const byCategory = filterAndSortGifts(sampleGifts, { category: 'entrances' });
  assert.equal(byCategory.length, 1);
  assert.equal(byCategory[0].id, 'gift-1');

  const byFormat = filterAndSortGifts(sampleGifts, { format: 'Lottie' });
  assert.equal(byFormat.length, 1);
  assert.equal(byFormat[0].id, 'gift-2');

  const bySearch = filterAndSortGifts(sampleGifts, { searchQuery: 'تنين' });
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'gift-1');
});

test('computeCatalogStats calculates accurate totals and category breakdown', () => {
  const stats = computeCatalogStats(sampleGifts);
  assert.equal(stats.totalCount, 3);
  assert.equal(stats.publishedCount, 2);
  assert.equal(stats.totalBytes, 12_620_000);
  assert.equal(stats.byCategory.entrances, 1);
  assert.equal(stats.byCategory.frames, 1);
  assert.equal(stats.byFormat.SVGA, 1);
});
