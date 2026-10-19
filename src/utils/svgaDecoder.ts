import { inflate } from 'pako';
import { getMovieEntityType } from './svgaProto';
import type { MovieEntity } from '../types/svga';

export interface DecodedSvgaMovie {
  version: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  images: Map<string, ImageBitmap | HTMLImageElement>;
  sprites: Array<{
    imageKey: string;
    frames: Array<{
      alpha: number;
      layout: { x: number; y: number; width: number; height: number };
      transform: { a: number; b: number; c: number; d: number; tx: number; ty: number };
    }>;
  }>;
}

export async function decodeSvgaBuffer(buffer: ArrayBuffer | Uint8Array): Promise<DecodedSvgaMovie> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // SVGA 2.0 files are zlib-deflated protobuf streams.
  // In some rare cases (uncompressed SVGA), first bytes might not be zlib magic.
  let inflated: Uint8Array;
  try {
    inflated = inflate(bytes);
  } catch (err) {
    // If inflate fails, attempt directly decoding in case it's raw protobuf
    inflated = bytes;
  }

  const MovieEntityType = getMovieEntityType();
  const decoded = MovieEntityType.decode(inflated) as unknown as MovieEntity;

  const width = decoded.params?.viewBoxWidth || 500;
  const height = decoded.params?.viewBoxHeight || 500;
  const fps = decoded.params?.fps || 20;
  const totalFrames = decoded.params?.frames || 1;

  const imagesMap = new Map<string, ImageBitmap | HTMLImageElement>();

  if (decoded.images) {
    const entries = Object.entries(decoded.images);
    await Promise.all(
      entries.map(async ([key, imgData]) => {
        try {
          const uint8 = imgData instanceof Uint8Array ? imgData : new Uint8Array(imgData as any);
          const blob = new Blob([uint8]);
          if ('createImageBitmap' in window) {
            const bitmap = await createImageBitmap(blob);
            imagesMap.set(key, bitmap);
          } else {
            const img = new Image();
            const url = URL.createObjectURL(blob);
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                imagesMap.set(key, img);
                resolve();
              };
              img.onerror = () => reject(new Error(`Failed to load frame image ${key}`));
              img.src = url;
            });
          }
        } catch (e) {
          console.warn(`Could not decode image for key ${key}:`, e);
        }
      })
    );
  }

  const sprites = (decoded.sprites || []).map((s) => ({
    imageKey: s.imageKey,
    frames: (s.frames || []).map((f) => ({
      alpha: f.alpha !== undefined ? f.alpha : 1.0,
      layout: {
        x: f.layout?.x || 0,
        y: f.layout?.y || 0,
        width: f.layout?.width || width,
        height: f.layout?.height || height
      },
      transform: {
        a: f.transform?.a !== undefined ? f.transform.a : 1.0,
        b: f.transform?.b || 0,
        c: f.transform?.c || 0,
        d: f.transform?.d !== undefined ? f.transform.d : 1.0,
        tx: f.transform?.tx || 0,
        ty: f.transform?.ty || 0
      }
    }))
  }));

  return {
    version: decoded.version || '2.0',
    width,
    height,
    fps,
    totalFrames,
    images: imagesMap,
    sprites
  };
}
