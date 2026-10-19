export interface MovieParams {
  viewBoxWidth: number;
  viewBoxHeight: number;
  fps: number;
  frames: number;
}

export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface FrameEntity {
  alpha?: number;
  layout?: Layout;
  transform?: Transform;
  clipPath?: string;
  shapes?: any[];
}

export interface SpriteEntity {
  imageKey: string;
  frames: FrameEntity[];
  matteKey?: string;
}

export interface MovieEntity {
  version: string;
  params: MovieParams;
  images: Record<string, Uint8Array>;
  sprites: SpriteEntity[];
  audios?: any[];
}

export type CompressionPreset =
  | 'atomic_zero' // < 80 KB
  | 'zero_micro'   // < 150 KB
  | 'ultra_mega'   // < 300 KB
  | 'strong'       // < 500 KB
  | 'balanced'     // < 800 KB
  | 'hq';          // Original

export interface ConversionConfig {
  sizeMode: 'source' | '750x1334' | '500x500' | '1080x1920' | '2000x2000' | 'custom';
  customWidth: number;
  customHeight: number;
  scaleFactor: number;
  fps: number;
  quality: number;
  imageFormat: 'webp' | 'jpeg' | 'png';
  fit: 'contain' | 'cover' | 'stretch';
  compression: CompressionPreset;
  targetMaxKb: number | null;
  targetSizeMb: number | null;
  enableColorReduction: boolean;
  colorBits?: 4 | 5 | 6 | 8 | 'original';
  colorDepthMode?: 'ultra_palette' | 'quantized_128' | 'standard';
  frameDeduplication: boolean;
  deltaKeyframing?: boolean;
  maxDimensionCap: number | null;
  noiseReduction: boolean;
  removeBlackBg: boolean;
  blackBgThreshold: number;
  cropTransparentEdges: boolean;
  cleanDirtyAlpha?: boolean;
  enableTrim: boolean;
  startTime: number;
  endTime: number;
  zeroMicroCompression: boolean;
}

export interface ExtractedFrameItem {
  index: number;
  time: number;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressedBytes: Uint8Array;
  compressedBlob: Blob;
  compressedUrl: string;
  imageKey: string;
  isDuplicate: boolean;
  duplicateOfIndex?: number;
  layout: Layout;
  transform?: Transform;
  width: number;
  height: number;
}

export type PipelineStage = 'idle' | 'extracting' | 'compressing' | 'ready_to_assemble' | 'assembling' | 'completed';

export interface ConversionProgressState {
  isConverting: boolean;
  stageName: PipelineStage;
  percent: number;
  stage: string;
  status: string;
  currentFrame?: number;
  totalFrames?: number;
  currentSizeEstimate?: number;
  savedFramesCount?: number;
  rawImagesSizeTotal?: number;
  compressedImagesSizeTotal?: number;
}

export interface SvgaResultData {
  blob: Blob;
  url: string;
  filename: string;
  sizeBytes: number;
  width: number;
  height: number;
  fps: number;
  frames: number;
  durationSeconds: number;
  originalSizeBytes: number;
  rawFramesTotalBytes: number;
  compressedFramesTotalBytes: number;
  movieEntity: MovieEntity;
  framesList?: ExtractedFrameItem[];
}

export interface FileEstimate {
  bytes: number;
  formatted: string;
  percentageOfOriginal: number;
  status: 'safe' | 'medium' | 'large';
  statusText: string;
}
