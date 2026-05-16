const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const sizes = [16, 48, 128];
const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6"/>
      <stop offset="100%" style="stop-color:#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#g)"/>
  <text x="${size * 0.5}" y="${size * 0.68}" text-anchor="middle" fill="white" font-size="${size * 0.55}" font-weight="bold" font-family="Inter, sans-serif">S</text>
</svg>`;

const iconsDir = join(__dirname, '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

sizes.forEach(size => {
  writeFileSync(join(iconsDir, `icon${size}.svg`), svgTemplate(size));
});

console.log('Extension icons generated in icons/');
