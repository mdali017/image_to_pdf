/**
 * Blur detection utility using Laplacian variance method.
 * 
 * The Laplacian operator highlights regions of rapid intensity change (edges).
 * A sharp image has many strong edges → high variance.
 * A blurry image has weak/no edges → low variance.
 */

/**
 * Calculate the "sharpness score" of an image from a canvas.
 * Returns a number: higher = sharper. Typical threshold: ~15-25 for "acceptably sharp".
 */
export function calculateSharpness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  const width = canvas.width;
  const height = canvas.height;

  // For performance, analyze a downscaled center crop
  const sampleSize = Math.min(300, Math.min(width, height));
  const startX = Math.floor((width - sampleSize) / 2);
  const startY = Math.floor((height - sampleSize) / 2);

  const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize);
  const data = imageData.data;

  // Convert to grayscale intensity array
  const gray: number[] = new Array(sampleSize * sampleSize);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // Apply 3x3 Laplacian kernel: [0, 1, 0], [1, -4, 1], [0, 1, 0]
  let sumVariance = 0;
  let count = 0;

  for (let y = 1; y < sampleSize - 1; y++) {
    for (let x = 1; x < sampleSize - 1; x++) {
      const idx = y * sampleSize + x;
      const laplacian =
        gray[idx - sampleSize] +        // top
        gray[idx + sampleSize] +        // bottom
        gray[idx - 1] +                 // left
        gray[idx + 1] -                 // right
        4 * gray[idx];                  // center

      sumVariance += laplacian * laplacian;
      count++;
    }
  }

  // Return variance (standard deviation squared, normalized)
  return count > 0 ? sumVariance / count : 0;
}

/**
 * Determine blur status from sharpness score
 */
export type BlurStatus = 'sharp' | 'acceptable' | 'blurry' | 'very-blurry';

export function getBlurStatus(sharpnessScore: number): BlurStatus {
  if (sharpnessScore >= 80) return 'sharp';
  if (sharpnessScore >= 25) return 'acceptable';
  if (sharpnessScore >= 10) return 'blurry';
  return 'very-blurry';
}

export function getBlurMessage(status: BlurStatus): string {
  switch (status) {
    case 'sharp':
      return '✨ Excellent! Image is crystal clear';
    case 'acceptable':
      return '👍 Good enough — ready to capture';
    case 'blurry':
      return '⚠️ A bit blurry — hold steady!';
    case 'very-blurry':
      return '❌ Too blurry — hold the camera steady and ensure good lighting';
  }
}

