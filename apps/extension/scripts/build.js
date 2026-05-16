const { execSync } = require('child_process');
const { cpSync, mkdirSync, existsSync, rmSync } = require('fs');
const { join } = require('path');

const dist = join(__dirname, '..', 'dist');

if (existsSync(dist)) {
  rmSync(dist, { recursive: true });
}
mkdirSync(dist, { recursive: true });

try {
  execSync(
    `npx esbuild src/content.ts --bundle --minify --target=chrome110 --outfile=dist/content.js --define:globalThis.WS_URL=\\"ws://localhost:4000\\"`,
    { stdio: 'inherit', cwd: join(__dirname, '..') }
  );
} catch {
  execSync(
    `npx esbuild src/content.ts --bundle --minify --target=chrome110 --outfile=dist/content.js`,
    { stdio: 'inherit', cwd: join(__dirname, '..') }
  );
}

execSync(
  `npx esbuild src/background.ts --bundle --minify --target=chrome110 --outfile=dist/background.js`,
  { stdio: 'inherit', cwd: join(__dirname, '..') }
);

execSync(
  `npx esbuild src/popup.ts --bundle --minify --target=chrome110 --outfile=dist/popup.js`,
  { stdio: 'inherit', cwd: join(__dirname, '..') }
);

cpSync(join(__dirname, '..', 'manifest.json'), join(dist, 'manifest.json'));
cpSync(join(__dirname, '..', 'src', 'popup.html'), join(dist, 'popup.html'));
cpSync(join(__dirname, '..', 'icons'), join(dist, 'icons'), { recursive: true });

console.log('Extension built successfully in dist/');
