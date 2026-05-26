const { execSync } = require('child_process');
const { cpSync, mkdirSync, existsSync, rmSync } = require('fs');
const { join } = require('path');

const dist = join(__dirname, '..', 'dist');
const wsUrl = process.env.EXTENSION_WS_URL || 'wss://api.syncsaga.app/ws';

if (existsSync(dist)) {
  rmSync(dist, { recursive: true });
}
mkdirSync(dist, { recursive: true });

const define = `globalThis.WS_URL="${wsUrl}"`;

function build(src, out) {
  try {
    execSync(
      `npx esbuild ${src} --bundle --minify --target=chrome110 --outfile=${out} --define:${define}`,
      { stdio: 'inherit', cwd: join(__dirname, '..') }
    );
  } catch {
    execSync(
      `npx esbuild ${src} --bundle --minify --target=chrome110 --outfile=${out}`,
      { stdio: 'inherit', cwd: join(__dirname, '..') }
    );
  }
}

build('src/content.ts', 'dist/content.js');
build('src/background.ts', 'dist/background.js');
build('src/popup.ts', 'dist/popup.js');

cpSync(join(__dirname, '..', 'manifest.json'), join(dist, 'manifest.json'));
cpSync(join(__dirname, '..', 'src', 'popup.html'), join(dist, 'popup.html'));

try { cpSync(join(__dirname, '..', 'icons'), join(dist, 'icons'), { recursive: true }); } catch {}

console.log(`Extension built successfully in dist/ (WS_URL: ${wsUrl})`);
