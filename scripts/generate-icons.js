// Script to generate all PWA icon sizes from the source icon
// Uses only built-in Node.js modules + HTML Canvas via a minimal approach

const fs = require('fs');
const { execSync } = require('child_process');

const SOURCE = 'e:/Projects/image_to_pdf/public/icon-source.jpg';
const OUTPUT_DIR = 'e:/Projects/image_to_pdf/public/icons';

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

// We'll create a simple HTML file and use Node to generate resized icons
// Since we don't have sharp/canvas npm packages, we'll use a pure JS approach
// by creating a Node script that writes resized versions

// For PWA icons, the simplest approach without native image libraries
// is to copy the source as all sizes and let the browser handle scaling.
// However, for proper sizing, let's install sharp temporarily.

async function main() {
  try {
    // Try using sharp for proper resizing
    const sharp = require('sharp');
    const sourceBuffer = fs.readFileSync(SOURCE);

    for (const size of SIZES) {
      const outputPath = `${OUTPUT_DIR}/icon-${size}x${size}.png`;
      await sharp(sourceBuffer)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(outputPath);
      console.log(`Created: icon-${size}x${size}.png`);
    }

    for (const size of MASKABLE_SIZES) {
      // Maskable icons need 10% safe zone padding
      const innerSize = Math.round(size * 0.8);
      const padding = Math.round((size - innerSize) / 2);

      const resizedIcon = await sharp(sourceBuffer)
        .resize(innerSize, innerSize, { fit: 'cover' })
        .png()
        .toBuffer();

      // Create canvas with padding and gradient background
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 79, g: 70, b: 229, alpha: 1 }, // indigo-600
        },
      })
        .composite([{ input: resizedIcon, left: padding, top: padding }])
        .png()
        .toFile(`${OUTPUT_DIR}/icon-maskable-${size}x${size}.png`);

      console.log(`Created: icon-maskable-${size}x${size}.png`);
    }

    // Also create favicon
    await sharp(sourceBuffer)
      .resize(32, 32, { fit: 'cover' })
      .png()
      .toFile('e:/Projects/image_to_pdf/public/favicon.png');
    console.log('Created: favicon.png');

    console.log('\nAll icons generated successfully!');
  } catch (err) {
    console.error('Sharp not available, using copy fallback:', err.message);
    // Fallback: just copy source to all sizes
    const sourceBuffer = fs.readFileSync(SOURCE);
    for (const size of SIZES) {
      fs.copyFileSync(SOURCE, `${OUTPUT_DIR}/icon-${size}x${size}.png`);
      console.log(`Copied source as: icon-${size}x${size}.png`);
    }
    for (const size of MASKABLE_SIZES) {
      fs.copyFileSync(SOURCE, `${OUTPUT_DIR}/icon-maskable-${size}x${size}.png`);
      console.log(`Copied source as: icon-maskable-${size}x${size}.png`);
    }
    fs.copyFileSync(SOURCE, 'e:/Projects/image_to_pdf/public/favicon.png');
    console.log('Copied source as: favicon.png');
  }
}

main();

