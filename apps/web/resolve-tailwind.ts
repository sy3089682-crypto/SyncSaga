import Module from 'module';
import path from 'path';
import fs from 'fs';

// Helper to find absolute path of a package
function findPackagePath(packageName: string): string | null {
  const possiblePaths = [
    path.join(__dirname, 'node_modules', packageName),
    path.join(__dirname, '../../node_modules', packageName),
    path.join(__dirname, '../node_modules', packageName),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  try {
    const entryPath = require.resolve(packageName);
    // Move up to package directory
    let current = entryPath;
    while (current !== path.dirname(current)) {
      if (path.basename(current) === packageName || fs.existsSync(path.join(current, 'package.json'))) {
        return current;
      }
      current = path.dirname(current);
    }
  } catch (e) {}

  return null;
}

const tailwindPath = findPackagePath('tailwindcss');
const postcssPath = findPackagePath('postcss');

const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  if (request === 'tailwindcss/plugin' && tailwindPath) {
    return path.join(tailwindPath, 'plugin.js');
  }
  if (request === 'tailwindcss/colors' && tailwindPath) {
    return path.join(tailwindPath, 'colors.js');
  }
  if (request === 'postcss' && postcssPath) {
    try {
      return require.resolve('postcss', { paths: [path.dirname(postcssPath)] });
    } catch (e) {
      return path.join(postcssPath, 'lib/postcss.js');
    }
  }
  return originalResolveFilename.apply(this, arguments);
};
