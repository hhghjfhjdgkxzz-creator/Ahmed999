import type { ConversionConfig, FileEstimate } from '../types/svga';
import type { VideoMetadata } from './svgaEncoder';

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function estimateSvgaFileSize(
  metadata: VideoMetadata | null,
  config: ConversionConfig,
  originalSizeBytes: number = 0
): FileEstimate {
  if (!metadata || metadata.duration <= 0) {
    return {
      bytes: 0,
      formatted: '0 KB',
      percentageOfOriginal: 0,
      status: 'safe',
      statusText: 'بانتظار تحديد الفيديو'
    };
  }

  let baseW = metadata.width;
  let baseH = metadata.height;

  switch (config.sizeMode) {
    case '750x1334':
      baseW = 750;
      baseH = 1334;
      break;
    case '500x500':
      baseW = 500;
      baseH = 500;
      break;
    case '1080x1920':
      baseW = 1080;
      baseH = 1920;
      break;
    case '2000x2000':
      baseW = 2000;
      baseH = 2000;
      break;
    case 'custom':
      baseW = config.customWidth || metadata.width;
      baseH = config.customHeight || metadata.height;
      break;
    case 'source':
    default:
      baseW = metadata.width;
      baseH = metadata.height;
      break;
  }

  if (config.maxDimensionCap && (baseW > config.maxDimensionCap || baseH > config.maxDimensionCap)) {
    const ratio = baseW / baseH;
    if (baseW > baseH) {
      baseW = config.maxDimensionCap;
      baseH = Math.round(baseW / ratio);
    } else {
      baseH = config.maxDimensionCap;
      baseW = Math.round(baseH * ratio);
    }
  }

  const effectiveScale = config.scaleFactor || 0.65;
  const effectiveW = Math.max(16, Math.round(baseW * effectiveScale));
  const effectiveH = Math.max(16, Math.round(baseH * effectiveScale));
  const pixels = effectiveW * effectiveH;

  const rawDuration = metadata.duration;
  const start = config.enableTrim ? Math.max(0, Math.min(rawDuration - 0.1, config.startTime || 0)) : 0;
  const end = config.enableTrim ? Math.min(rawDuration, Math.max(start + 0.1, config.endTime || rawDuration)) : rawDuration;
  const activeDuration = Math.max(0.1, end - start);

  const fps = config.fps || 12;
  const totalFrames = Math.max(1, Math.round(activeDuration * fps));

  const qRatio = Math.max(0.10, Math.min(1.0, config.quality / 100));
  let bytePerPixel = 0.045;

  if (config.imageFormat === 'webp') {
    bytePerPixel = 0.024 * Math.pow(qRatio, 1.4);
  } else if (config.imageFormat === 'jpeg') {
    bytePerPixel = 0.035 * Math.pow(qRatio, 1.4);
  } else {
    bytePerPixel = (0.10 + (config.enableColorReduction ? 0.02 : 0.07)) * Math.pow(qRatio, 0.7);
  }

  if (config.removeBlackBg) {
    bytePerPixel *= 0.32; // 68% reduction due to transparent zero-byte areas
  }

  if (config.enableColorReduction || config.colorBits !== 'original') {
    bytePerPixel *= 0.65;
  }

  if (config.noiseReduction || config.zeroMicroCompression) {
    bytePerPixel *= 0.78;
  }

  const frameBytesEstimate = Math.max(300, pixels * bytePerPixel);

  const uniqueFramesRatio = config.frameDeduplication ? 0.70 : 1.0;
  let totalEstimatedBytes = frameBytesEstimate * (totalFrames * uniqueFramesRatio);

  if (config.compression === 'atomic_zero') {
    totalEstimatedBytes *= 0.45; // Atomic zero compression
  } else if (config.zeroMicroCompression || config.compression === 'zero_micro') {
    totalEstimatedBytes *= 0.55;
  }

  totalEstimatedBytes *= 0.88; // Zlib Deflate Level 9

  const protoOverhead = Math.round(totalFrames * 22);
  totalEstimatedBytes += protoOverhead;

  const bytes = Math.max(18 * 1024, Math.round(totalEstimatedBytes));
  const formatted = formatBytes(bytes);

  const percentageOfOriginal =
    originalSizeBytes > 0 ? Math.round((bytes / originalSizeBytes) * 100) : 100;

  let status: 'safe' | 'medium' | 'large' = 'safe';
  let statusText = 'حجم ذري فائق الصغر للصفر (< 150 KB) — مثالي لجميع المنصات';

  if (bytes > 1.5 * 1024 * 1024) {
    status = 'large';
    statusText = 'حجم كبير نسبيًا (> 1.5 MB) - يُنصح بتفعيل وضع الضغط الذري';
  } else if (bytes > 500 * 1024) {
    status = 'medium';
    statusText = 'حجم متوسط (500 KB - 1.5 MB) - مقبول في بيجو لايف';
  }

  return {
    bytes,
    formatted,
    percentageOfOriginal,
    status,
    statusText
  };
}

export function optimizeConfigForTargetSize(
  targetMb: number,
  metadata: VideoMetadata | null
): Partial<ConversionConfig> {
  if (!metadata) return {};

  if (targetMb <= 0.08) {
    return {
      imageFormat: 'webp',
      fps: 10,
      quality: 28,
      scaleFactor: 0.5,
      maxDimensionCap: 500,
      enableColorReduction: true,
      colorBits: 4,
      frameDeduplication: true,
      noiseReduction: true,
      removeBlackBg: true,
      zeroMicroCompression: true,
      cropTransparentEdges: true,
      compression: 'atomic_zero'
    };
  }

  if (targetMb <= 0.15) {
    return {
      imageFormat: 'webp',
      fps: 10,
      quality: 35,
      scaleFactor: 0.65,
      maxDimensionCap: 500,
      enableColorReduction: true,
      colorBits: 5,
      frameDeduplication: true,
      noiseReduction: true,
      removeBlackBg: true,
      zeroMicroCompression: true,
      cropTransparentEdges: true,
      compression: 'zero_micro'
    };
  }

  if (targetMb <= 0.3) {
    return {
      imageFormat: 'webp',
      fps: 12,
      quality: 42,
      scaleFactor: 0.65,
      maxDimensionCap: 750,
      enableColorReduction: true,
      colorBits: 5,
      frameDeduplication: true,
      noiseReduction: true,
      removeBlackBg: true,
      zeroMicroCompression: true,
      cropTransparentEdges: true,
      compression: 'ultra_mega'
    };
  }

  if (targetMb <= 0.5) {
    return {
      imageFormat: 'webp',
      fps: 15,
      quality: 55,
      scaleFactor: 0.75,
      maxDimensionCap: 750,
      enableColorReduction: true,
      colorBits: 6,
      frameDeduplication: true,
      noiseReduction: true,
      removeBlackBg: true,
      zeroMicroCompression: false,
      cropTransparentEdges: true,
      compression: 'strong'
    };
  }

  return {
    imageFormat: 'webp',
    fps: 18,
    quality: 70,
    scaleFactor: 1.0,
    maxDimensionCap: null,
    enableColorReduction: false,
    colorBits: 'original',
    frameDeduplication: true,
    noiseReduction: false,
    removeBlackBg: false,
    zeroMicroCompression: false,
    cropTransparentEdges: false,
    compression: 'balanced'
  };
}
