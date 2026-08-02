// Generates placeholder extension icons (SVG) used by manifest.json.
// Chrome MV3 accepts SVG icons; keeps the build hermetic without binary assets.
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const iconsDir = join(__dirname, '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 48, 128];

for (const size of sizes) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#g)"/>
  <polygon points="${(size / 2).toFixed(1)},${(size * 0.3).toFixed(1)} ${(size * 0.68).toFixed(1)},${(size * 0.52).toFixed(1)} ${(size / 2).toFixed(1)},${(size * 0.74).toFixed(1)} ${(size * 0.32).toFixed(1)},${(size * 0.52).toFixed(1)}" fill="#ffffff"/>
</svg>`;
  writeFileSync(join(iconsDir, `icon${size}.svg`), svg);
}

console.log('Generated extension icons:', sizes.map(s => `icon${s}.svg`).join(', '));
