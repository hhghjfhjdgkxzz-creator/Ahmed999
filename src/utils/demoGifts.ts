import type { GiftItem } from './catalogLogic.ts';

function encodeSvgDataUri(svgContent: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}

export const ROYAL_DRAGON_SVG = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#7C3AED" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#08060E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF3B0"/>
      <stop offset="45%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#8A640F"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B0764"/>
      <stop offset="50%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bgGlow)"/>
  <g transform="translate(300,300)">
    <circle r="210" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="12 8" opacity="0.6">
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="18s" repeatCount="indefinite"/>
    </circle>
    <circle r="175" fill="none" stroke="url(#purpleGrad)" stroke-width="3" stroke-dasharray="40 15" opacity="0.8">
      <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="12s" repeatCount="indefinite"/>
    </circle>
    <g>
      <animateTransform attributeName="transform" type="scale" values="0.96;1.04;0.96" dur="3.2s" repeatCount="indefinite"/>
      <polygon points="0,-135 45,-35 140,-55 85,45 110,120 0,85 -110,120 -85,45 -140,-55 -45,-35" fill="url(#purpleGrad)" stroke="url(#goldGrad)" stroke-width="4"/>
      <polygon points="0,-115 32,-25 98,-40 58,32 0,65 -58,32 -98,-40 -32,-25" fill="url(#goldGrad)" opacity="0.9"/>
      <circle cx="-28" cy="-10" r="8" fill="#08060E"/>
      <circle cx="28" cy="-10" r="8" fill="#08060E"/>
      <circle cx="0" cy="-75" r="14" fill="#F43F5E">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </g>
    <text y="195" text-anchor="middle" fill="#FFF3B0" font-family="sans-serif" font-weight="bold" font-size="22" letter-spacing="3">ROYAL EMPEROR</text>
  </g>
</svg>
`);

export const VIP_AVATAR_FRAME_SVG = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="frameGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="gemPurple" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E879F9"/>
      <stop offset="100%" stop-color="#6B21A8"/>
    </linearGradient>
  </defs>
  <g transform="translate(300,300)">
    <circle r="195" fill="none" stroke="url(#frameGold)" stroke-width="18" opacity="0.25">
      <animate attributeName="r" values="190;205;190" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="24s" repeatCount="indefinite"/>
      <circle r="175" fill="none" stroke="url(#frameGold)" stroke-width="12" stroke-dasharray="30 14"/>
      <circle cx="0" cy="-175" r="16" fill="url(#gemPurple)" stroke="#FDE68A" stroke-width="3"/>
      <circle cx="175" cy="0" r="16" fill="url(#gemPurple)" stroke="#FDE68A" stroke-width="3"/>
      <circle cx="0" cy="175" r="16" fill="url(#gemPurple)" stroke="#FDE68A" stroke-width="3"/>
      <circle cx="-175" cy="0" r="16" fill="url(#gemPurple)" stroke="#FDE68A" stroke-width="3"/>
    </g>
    <circle r="145" fill="#130F24" stroke="url(#frameGold)" stroke-width="6"/>
    <path d="M-55,-145 L-30,-195 L0,-165 L30,-195 L55,-145 Z" fill="url(#frameGold)" stroke="#FFF" stroke-width="2">
      <animateTransform attributeName="transform" type="translate" values="0,0; 0,-6; 0,0" dur="2s" repeatCount="indefinite"/>
    </path>
    <text y="8" text-anchor="middle" fill="#FDE68A" font-family="sans-serif" font-weight="bold" font-size="34">VIP 10</text>
    <text y="42" text-anchor="middle" fill="#C084FC" font-family="sans-serif" font-size="16" letter-spacing="2">MIC FRAME</text>
  </g>
</svg>
`);

export const LUXURY_YACHT_SVG = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="hullGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4AF37"/>
      <stop offset="50%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#A16207"/>
    </linearGradient>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#1E1B4B" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <g transform="translate(300,310)">
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,-8; 0,8; 0,-8" dur="3s" repeatCount="indefinite"/>
      <polygon points="-210,30 220,30 165,95 -175,95" fill="url(#hullGrad)" stroke="#FFF" stroke-width="2"/>
      <polygon points="-130,30 130,30 95,-35 -95,-35" fill="#1E1B4B" stroke="#D4AF37" stroke-width="3"/>
      <polygon points="-70,-35 75,-35 45,-85 -40,-85" fill="#311042" stroke="#FDE047" stroke-width="2"/>
      <line x1="0" y1="-85" x2="0" y2="-145" stroke="#FDE047" stroke-width="4"/>
      <polygon points="0,-145 55,-125 0,-105" fill="#A855F7"/>
    </g>
    <ellipse cx="0" cy="105" rx="230" ry="28" fill="url(#waveGrad)">
      <animate attributeName="rx" values="215;245;215" dur="3s" repeatCount="indefinite"/>
    </ellipse>
  </g>
</svg>
`);

export const PEGASUS_EFFECT_SVG = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="nebula" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0.5"/>
      <stop offset="60%" stop-color="#4C1D95" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#08060E" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="300" cy="300" r="260" fill="url(#nebula)"/>
  <g transform="translate(300,300)">
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="15s" repeatCount="indefinite"/>
      <polygon points="0,-210 18,-40 190,-95 45,10 135,165 0,55 -135,165 -45,10 -190,-95 -18,-40" fill="none" stroke="#D4AF37" stroke-width="3" opacity="0.7"/>
    </g>
    <circle r="85" fill="#7C3AED" opacity="0.35">
      <animate attributeName="r" values="70;110;70" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <polygon points="0,-110 28,-28 110,0 28,28 0,110 -28,28 -110,0 -28,-28" fill="#FDE68A">
      <animateTransform attributeName="transform" type="scale" values="0.85;1.15;0.85" dur="1.8s" repeatCount="indefinite"/>
    </polygon>
  </g>
</svg>
`);

export const GOLDEN_MIC_SVG = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="micGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>
  <g transform="translate(300,300)">
    <circle r="170" fill="none" stroke="#A855F7" stroke-width="4" opacity="0.4">
      <animate attributeName="r" values="140;210" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.7;0" dur="2s" repeatCount="indefinite"/>
    </circle>
    <rect x="-50" y="-140" width="100" height="150" rx="50" fill="url(#micGold)" stroke="#FFF" stroke-width="3"/>
    <line x1="-50" y1="-90" x2="50" y2="-90" stroke="#78350F" stroke-width="4"/>
    <line x1="-50" y1="-60" x2="50" y2="-60" stroke="#78350F" stroke-width="4"/>
    <line x1="-50" y1="-30" x2="50" y2="-30" stroke="#78350F" stroke-width="4"/>
    <path d="M-80,-40 A80,80 0 0,0 80,-40" fill="none" stroke="url(#micGold)" stroke-width="12" stroke-linecap="round"/>
    <line x1="0" y1="40" x2="0" y2="130" stroke="url(#micGold)" stroke-width="14"/>
    <rect x="-65" y="130" width="130" height="22" rx="11" fill="url(#micGold)"/>
  </g>
</svg>
`);

export const LOTTIE_CROWN_JSON = JSON.stringify({
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 180,
  w: 500,
  h: 500,
  nm: 'VIP 10 Royal Crest',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Inner Royal Star',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [360], i: { x: [0.5], y: [0.5] }, o: { x: [0.5], y: [0.5] } },
            { t: 180, s: [360] },
          ],
        },
        p: { a: 0, k: [250, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [88, 88, 100], e: [108, 108, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 90, s: [108, 108, 100], e: [88, 88, 100], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 180, s: [88, 88, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sr',
              sy: 1,
              d: 1,
              pt: { a: 0, k: 8 },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 0 },
              ir: { a: 0, k: 75 },
              is: { a: 0, k: 0 },
              or: { a: 0, k: 145 },
              os: { a: 0, k: 0 },
              nm: 'Gold Star',
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.99, 0.9, 0.54, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 8 },
              lc: 2,
              lj: 2,
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.83, 0.68, 0.21, 0.85] },
              o: { a: 0, k: 100 },
              r: 1,
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Royal Star Group',
        },
      ],
      ip: 0,
      op: 180,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Outer Halo Ring',
      sr: 1,
      ks: {
        o: { a: 0, k: 90 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [360], e: [0], i: { x: [0.5], y: [0.5] }, o: { x: [0.5], y: [0.5] } },
            { t: 180, s: [0] },
          ],
        },
        p: { a: 0, k: [250, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              d: 1,
              ty: 'el',
              s: { a: 0, k: [360, 360] },
              p: { a: 0, k: [0, 0] },
              nm: 'Outer Ring',
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.66, 0.33, 0.97, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 10 },
              lc: 2,
              lj: 2,
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Ring Group',
        },
      ],
      ip: 0,
      op: 180,
      st: 0,
      bm: 0,
    },
  ],
});

export const INITIAL_DEMO_GIFTS: GiftItem[] = [
  {
    id: 'gift-royal-dragon-svga',
    name: 'تنين الإمبراطور الذهبي',
    category: 'entrances',
    description: 'دخولية ملكية ثلاثية الأبعاد لغرف الدردشة الصوتية مع مؤثرات اللهب الذهبي وزئير التنين.',
    originalUrl: ROYAL_DRAGON_SVG,
    thumbnailUrl: ROYAL_DRAGON_SVG,
    format: 'SVGA',
    sizeBytes: 4_820_400,
    quality: '4K',
    hasAudio: true,
    hasAlpha: true,
    isAnimated: true,
    displayOrder: 1,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-16T18:00:00.000Z',
    updatedAt: '2026-10-16T18:00:00.000Z',
    storageKey: 'gifts/originals/royal_emperor_dragon.svga',
  },
  {
    id: 'gift-vip10-crown-lottie',
    name: 'وسام الملوك VIP 10 المتوهج',
    category: 'vip',
    description: 'شعار ملكي متحرك بصيغة Lottie JSON قابل للتكبير اللانهائي بجودة Vector مع تدرجات ذهبية وبنفسجية.',
    originalUrl: '/api/catalog/demo-lottie/gift-vip10-crown-lottie',
    thumbnailUrl: VIP_AVATAR_FRAME_SVG,
    format: 'Lottie',
    sizeBytes: 148_200,
    quality: 'Vector',
    hasAudio: false,
    hasAlpha: true,
    isAnimated: true,
    displayOrder: 2,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-16T19:30:00.000Z',
    updatedAt: '2026-10-16T19:30:00.000Z',
    storageKey: 'gifts/originals/vip10_royal_crest.json',
  },
  {
    id: 'gift-mic-frame-apng',
    name: 'إطار مايك السيادة الملكية',
    category: 'frames',
    description: 'إطار صورة رمزية (Avatar Frame) شفاف بدقة 24-bit يدور بسلاسة حول المتحدث في الغرف الصوتية.',
    originalUrl: VIP_AVATAR_FRAME_SVG,
    thumbnailUrl: VIP_AVATAR_FRAME_SVG,
    format: 'APNG',
    sizeBytes: 1_940_000,
    quality: 'FHD',
    hasAudio: false,
    hasAlpha: true,
    isAnimated: true,
    displayOrder: 3,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-16T20:15:00.000Z',
    updatedAt: '2026-10-16T20:15:00.000Z',
    storageKey: 'gifts/originals/sovereign_mic_frame.apng',
  },
  {
    id: 'gift-luxury-yacht-vap',
    name: 'يخت المحيط الماسي VAP',
    category: 'entrances',
    description: 'دخولية يخت فاخر بصيغة VAP (Video Animation Player) مع قناة شفافية Alpha ومؤثرات أمواج صوتية.',
    originalUrl: LUXURY_YACHT_SVG,
    thumbnailUrl: LUXURY_YACHT_SVG,
    format: 'VAP',
    sizeBytes: 6_350_000,
    quality: '4K',
    hasAudio: true,
    hasAlpha: true,
    isAnimated: true,
    displayOrder: 4,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-16T21:00:00.000Z',
    updatedAt: '2026-10-16T21:00:00.000Z',
    storageKey: 'gifts/originals/diamond_ocean_yacht.vap',
  },
  {
    id: 'gift-nebula-stage-webm',
    name: 'مؤثر عاصفة المجرة الكونية',
    category: 'effects',
    description: 'مؤثر ملء الشاشة (Full-Screen Room Effect) يضيء خلفية الغرفة الصوتية بالكامل عند إرسال الهدايا الكبرى.',
    originalUrl: PEGASUS_EFFECT_SVG,
    thumbnailUrl: PEGASUS_EFFECT_SVG,
    format: 'WebM',
    sizeBytes: 3_210_000,
    quality: 'FHD',
    hasAudio: true,
    hasAlpha: true,
    isAnimated: true,
    displayOrder: 5,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-16T22:10:00.000Z',
    updatedAt: '2026-10-16T22:10:00.000Z',
    storageKey: 'gifts/originals/cosmic_nebula_storm.webm',
  },
  {
    id: 'gift-golden-mic-drop-mp4',
    name: 'مايك الألماس الذهبي',
    category: 'gifts',
    description: 'هدية غرفة صوتية تفاعلية مع موجات صوتية ذهبية متوهجة وتأثير احتفالي للمغنين والمذيعين.',
    originalUrl: GOLDEN_MIC_SVG,
    thumbnailUrl: GOLDEN_MIC_SVG,
    format: 'MP4',
    sizeBytes: 2_780_000,
    quality: 'FHD',
    hasAudio: true,
    hasAlpha: false,
    isAnimated: true,
    displayOrder: 6,
    published: true,
    allowDownload: true,
    uploadedAt: '2026-10-17T01:00:00.000Z',
    updatedAt: '2026-10-17T01:00:00.000Z',
    storageKey: 'gifts/originals/diamond_gold_mic.mp4',
  },
];
