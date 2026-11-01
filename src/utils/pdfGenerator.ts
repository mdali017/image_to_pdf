import { PDFDocument } from 'pdf-lib';
import { ImageItem, PdfSettings } from '@/types';

const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612.0, 792.0],
  legal: [612.0, 1008.0],
};

const MARGINS: Record<string, number> = {
  none: 0,
  small: 20,
  normal: 36,
};

const QUALITY_VALUES: Record<string, number> = {
  high: 0.92,
  medium: 0.78,
  low: 0.6,
};

/**
 * Loads an image URL into an HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = url;
  });
}

/**
 * Convert any image (including WebP, filtered data, etc.) to JPEG Uint8Array bytes
 * applying compression quality.
 */
async function imageToJpegBytes(
  url: string,
  quality: number
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Fill white background for transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64Data = dataUrl.split(',')[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return { bytes, width: canvas.width, height: canvas.height };
}

export async function generatePdf(
  images: ImageItem[],
  settings: PdfSettings,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (images.length === 0) {
    throw new Error('No images to generate PDF');
  }

  const pdfDoc = await PDFDocument.create();
  const quality = QUALITY_VALUES[settings.quality] || 0.85;
  const marginPt = MARGINS[settings.margin] ?? 0;

  for (let i = 0; i < images.length; i++) {
    if (onProgress) {
      onProgress(i + 1, images.length);
    }

    const item = images[i];
    // Get image bytes and dimensions
    const { bytes, width: imgW, height: imgH } = await imageToJpegBytes(
      item.processedUrl || item.originalUrl,
      quality
    );

    const embeddedImage = await pdfDoc.embedJpg(bytes);

    let pageWidth: number;
    let pageHeight: number;

    if (settings.pageSize === 'fit') {
      // Fit to image dimensions
      pageWidth = imgW + marginPt * 2;
      pageHeight = imgH + marginPt * 2;
    } else {
      const baseDimensions = PAGE_SIZES[settings.pageSize] || PAGE_SIZES.a4;
      const isImageLandscape = imgW > imgH;

      let targetLandscape = false;
      if (settings.orientation === 'landscape') {
        targetLandscape = true;
      } else if (settings.orientation === 'portrait') {
        targetLandscape = false;
      } else {
        // Auto
        targetLandscape = isImageLandscape;
      }

      if (targetLandscape) {
        pageWidth = Math.max(baseDimensions[0], baseDimensions[1]);
        pageHeight = Math.min(baseDimensions[0], baseDimensions[1]);
      } else {
        pageWidth = Math.min(baseDimensions[0], baseDimensions[1]);
        pageHeight = Math.max(baseDimensions[0], baseDimensions[1]);
      }
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Printable area inside margins
    const availableWidth = Math.max(10, pageWidth - marginPt * 2);
    const availableHeight = Math.max(10, pageHeight - marginPt * 2);

    // Calculate scaling to preserve aspect ratio
    const scale = Math.min(availableWidth / imgW, availableHeight / imgH);
    const renderWidth = imgW * scale;
    const renderHeight = imgH * scale;

    // Center in printable area
    const x = marginPt + (availableWidth - renderWidth) / 2;
    const y = marginPt + (availableHeight - renderHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: renderWidth,
      height: renderHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  // Return as Blob
  return new Blob([pdfBytes as unknown as BlobPart], {
    type: 'application/pdf',
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

