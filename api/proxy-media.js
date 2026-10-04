import { Readable, pipeline } from 'stream';

// In-memory sliding-window rate limiter (per Vercel container instance)
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_MINUTE = 60;
const MAX_FILE_SIZE_BYTES = 55 * 1024 * 1024; // 55MB hard cap

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter(t => t > windowStart);
  
  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  
  // Clean old entries periodically
  if (rateLimitMap.size > 2000) {
    for (const [key, list] of rateLimitMap.entries()) {
      if (list.length === 0 || list[list.length - 1] < windowStart) {
        rateLimitMap.delete(key);
      }
    }
  }
  return true;
}

// SSRF Protection: Disallow loopback and private networks
function isSafeUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // Fast OPTIONS handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // 1. IP extraction & Rate Limiting
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
                   req.socket?.remoteAddress ||
                   'unknown';

  if (!checkRateLimit(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too Many Requests: Rate limit exceeded. Please wait 1 minute.' });
  }

  const targetUrl = req.query?.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url parameter' });
  }

  // 2. SSRF Check
  if (!isSafeUrl(targetUrl)) {
    return res.status(403).json({ error: 'Forbidden: Invalid or private target URL' });
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 12000); // 12s safety timeout

  // Handle client disconnect early
  req.on('close', () => {
    clearTimeout(timeoutId);
    abortController.abort();
  });

  try {
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'image/*,video/*,*/*;q=0.8',
    };

    // Forward Range header if requested (critical for HTML5 video seeking & low bandwidth)
    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    if (targetUrl.includes('top4top.io')) {
      upstreamHeaders['Referer'] = 'https://top4top.io/';
    }

    let upstream = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
      signal: abortController.signal
    });

    // Fallback retry with neutral headers if 403 hotlink blocked
    if ((upstream.status === 403 || upstream.status === 401) && !abortController.signal.aborted) {
      upstream = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: abortController.signal
      });
    }

    clearTimeout(timeoutId);

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send(`Upstream server returned error: ${upstream.status}`);
    }

    // Check Content-Length to protect Vercel bandwidth
    const contentLength = upstream.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({ 
        error: `File size exceeds the 55MB limit (${(parseInt(contentLength, 10) / (1024 * 1024)).toFixed(1)}MB). Please use direct CDN storage.` 
      });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');

    // Aggressive Edge & Browser Caching to prevent re-invocations on Vercel
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400');

    let contentType = upstream.headers.get('content-type') || '';
    if (!contentType || contentType.includes('text/html')) {
      if (/\.mp4($|\?)/i.test(targetUrl)) contentType = 'video/mp4';
      else if (/\.(svga|svga2)($|\?)/i.test(targetUrl)) contentType = 'application/octet-stream';
      else if (/\.webm($|\?)/i.test(targetUrl)) contentType = 'video/webm';
      else if (/\.(jpg|jpeg)($|\?)/i.test(targetUrl)) contentType = 'image/jpeg';
      else if (/\.png($|\?)/i.test(targetUrl)) contentType = 'image/png';
      else if (/\.webp($|\?)/i.test(targetUrl)) contentType = 'image/webp';
      else if (/\.gif($|\?)/i.test(targetUrl)) contentType = 'image/gif';
      else contentType = 'application/octet-stream';
    }
    res.setHeader('Content-Type', contentType);

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Partial content (206) support
    if (upstream.status === 206 || upstream.headers.get('content-range')) {
      res.status(206);
      if (upstream.headers.get('content-range')) {
        res.setHeader('Content-Range', upstream.headers.get('content-range'));
      }
    } else {
      res.status(200);
    }

    // HEAD request finishes here
    if (req.method === 'HEAD') {
      return res.end();
    }

    // Stream piping: stream directly without buffering whole file in RAM
    if (upstream.body && typeof Readable.fromWeb === 'function') {
      try {
        const stream = Readable.fromWeb(upstream.body);
        stream.on('error', () => {
          if (!res.headersSent) res.status(500).end();
        });
        return pipeline(stream, res, () => {});
      } catch {
        // Fallback if Readable.fromWeb fails
      }
    }

    const arrayBuffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    clearTimeout(timeoutId);
    if (abortController.signal.aborted) {
      return; // Request aborted
    }
    return res.status(502).json({ error: err.message || 'Proxy upstream failed or timed out' });
  }
}
