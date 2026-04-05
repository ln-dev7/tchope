import { useEffect } from 'react';
import { Image } from 'expo-image';
import { getRecipeImage } from '@/constants/images';

/**
 * IDs of the most visible recipes (featured + popular on home screen).
 * These are prefetched on app startup so they appear instantly.
 */
const PREFETCH_IDS = [
  'ndole', 'poulet-dg', 'eru', 'mbongo-tchobi', 'koki',
  'taro-sauce-jaune', 'kondre', 'sanga', 'okok-sucre',
  'poisson-braise', 'ekwang', 'met-de-pistache', 'okok-sale',
  'soya', 'pepper-soup', 'beignets-farine', 'plantains-frits-epices',
  'corn-tchap', 'njama-njama', 'kati-kati',
];

/**
 * Prefetches the most important recipe images into expo-image's cache.
 * Call once at app startup (e.g. in _layout.tsx or the home screen).
 * This is a no-op if the images are already cached.
 */
export function useImagePrefetch() {
  useEffect(() => {
    const urls = PREFETCH_IDS.map((id) => getRecipeImage(id, 'Plat'));
    // expo-image's prefetch accepts an array of URLs
    Image.prefetch(urls).catch(() => {
      // Silently ignore prefetch errors (user may be offline)
    });
  }, []);
}
