// Vercel Serverless Function for Clan Uploads & Clan Media
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { imageBase64, filename } = req.body || {};
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64' });
      }

      // Return optimized data URL or media reference
      return res.status(200).json({
        success: true,
        url: imageBase64,
        filename: filename || 'clan_img.jpg',
        size: imageBase64.length,
        mimeType: 'image/jpeg'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Upload handler failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
