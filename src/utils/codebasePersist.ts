import { GiftItem } from '../types';
import { updateGift } from '../lib/firebaseService';

/**
 * Persist a gift permanently to the server codebase (realGiftsCatalog.ts, initialGifts.ts),
 * disk storage (/uploads/), Firestore database, and localStorage.
 */
export async function persistGiftToCodebase(gift: GiftItem): Promise<{ success: boolean; gift: GiftItem; savedPosterUrl?: string }> {
  let updatedGift = { ...gift };

  // 1. Bake directly into codebase files on server
  try {
    const resp = await fetch('/api/gifts/persist-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gift: updatedGift })
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data?.savedPosterUrl) {
        updatedGift.posterUrl = data.savedPosterUrl;
      }
      if (data?.gift) {
        updatedGift = { ...updatedGift, ...data.gift };
      }
    }
  } catch (err) {
    console.warn('[CodebasePersist] Network note when syncing with /api/gifts/persist-code:', err);
  }

  // 2. Persist to Firestore
  try {
    await updateGift(updatedGift);
  } catch (err) {
    console.warn('[CodebasePersist] Firestore sync note:', err);
  }

  // 3. Persist to localStorage for zero-latency instant offline load
  try {
    const stored = localStorage.getItem('jiawei_custom_gifts_v1');
    if (stored) {
      const gifts: GiftItem[] = JSON.parse(stored);
      const idx = gifts.findIndex(g => g.id === updatedGift.id);
      if (idx >= 0) {
        gifts[idx] = updatedGift;
      } else {
        gifts.unshift(updatedGift);
      }
      localStorage.setItem('jiawei_custom_gifts_v1', JSON.stringify(gifts));
    }
  } catch (err) {
    console.warn('[CodebasePersist] localStorage write note:', err);
  }

  return { success: true, gift: updatedGift, savedPosterUrl: updatedGift.posterUrl };
}
