/**
 * Generates a high quality animated MP4/WebM video sample directly in browser
 * so users can test conversion immediately without needing their own video file.
 */
export async function generateSampleVideo(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext('2d')!;

  const fps = 25;
  const durationSec = 2;
  const totalFrames = fps * durationSec;

  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      const type = chunks[0]?.type || 'video/mp4';
      resolve(new Blob(chunks, { type }));
    };
  });

  mediaRecorder.start();

  // Render 2 seconds of smooth luxury golden particle gift animation
  for (let f = 0; f < totalFrames; f++) {
    const progress = f / totalFrames;
    const angle = progress * Math.PI * 2;

    // Background
    ctx.fillStyle = '#070b13';
    ctx.fillRect(0, 0, 500, 500);

    // Glowing circle
    const gradient = ctx.createRadialGradient(250, 250, 20, 250, 250, 200);
    gradient.addColorStop(0, 'rgba(244, 215, 126, 0.4)');
    gradient.addColorStop(0.5, 'rgba(212, 170, 77, 0.15)');
    gradient.addColorStop(1, 'rgba(7, 11, 19, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500, 500);

    // Rotating 3D Gold Star / Diamond
    ctx.save();
    ctx.translate(250, 250);
    ctx.rotate(angle);

    const scale = 0.85 + Math.sin(angle * 2) * 0.15;
    ctx.scale(scale, scale);

    // Draw diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(70, 0);
    ctx.lineTo(0, 90);
    ctx.lineTo(-70, 0);
    ctx.closePath();

    const starGrad = ctx.createLinearGradient(-70, -90, 70, 90);
    starGrad.addColorStop(0, '#fef08a');
    starGrad.addColorStop(0.5, '#eab308');
    starGrad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = starGrad;
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 25;
    ctx.fill();

    // Inner facet
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(40, 0);
    ctx.lineTo(0, 50);
    ctx.lineTo(-40, 0);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.restore();

    // Orbiting sparkle particles
    for (let p = 0; p < 8; p++) {
      const pAngle = angle * (p % 2 === 0 ? 1 : -1) + (p * Math.PI) / 4;
      const dist = 140 + Math.sin(angle * 3 + p) * 25;
      const px = 250 + Math.cos(pAngle) * dist;
      const py = 250 + Math.sin(pAngle) * dist;

      ctx.beginPath();
      ctx.arc(px, py, 4 + Math.sin(pAngle * 2) * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.fill();
    }

    // Frame delay for MediaRecorder stream
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  mediaRecorder.stop();
  const recordedBlob = await recordingPromise;

  return new File([recordedBlob], 'golden_gift_sample.mp4', { type: 'video/mp4' });
}
