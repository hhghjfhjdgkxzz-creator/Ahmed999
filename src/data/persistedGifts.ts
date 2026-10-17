import type { GiftItem } from '../utils/catalogLogic.ts';
import { INITIAL_DEMO_GIFTS } from '../utils/demoGifts.ts';

/**
 * Persisted Gifts Database — Baked directly into the source code repository.
 * Every uploaded, updated, or deleted gift is automatically synced here as code,
 * ensuring zero data loss and instant display across all users, previews, and deployments.
 */
export const PERSISTED_GIFTS: GiftItem[] = [
  {
    id: 'gift_1792235588173_3ef38c',
    name: '717 edited',
    category: 'gifts',
    description: 'فيديو عالي الدقة MP4 مع دعم كامل للمؤثرات الصوتية وجودة 4K.',
    originalUrl: '/gifts/originals/1792235588150_86a768c9_717_edited.mp4',
    thumbnailUrl: '/gifts/thumbnails/1792235588167_19a7ba83_Joy_animation_1_Cover.png',
    format: 'MP4',
    sizeBytes: 2409254,
    quality: 'Original',
    hasAudio: true,
    hasAlpha: false,
    isAnimated: true,
    displayOrder: 1,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-17T11:13:08.173Z',
    updatedAt: '2026-10-17T11:13:08.173Z',
    storageKey: 'gifts/originals/1792235588150_86a768c9_717_edited.mp4',
    thumbnailKey: 'gifts/thumbnails/1792235588167_19a7ba83_Joy_animation_1_Cover.png',
    checksum: '252b3e7447293a37',
  },
  ...INITIAL_DEMO_GIFTS,
];
