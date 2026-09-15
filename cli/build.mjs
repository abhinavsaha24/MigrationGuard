import esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

// Read version dynamically directly from cli/package.json
const pkgPath = new URL('./package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

if (!pkg.version) {
  throw new Error('cli/package.json is missing a "version" field.');
}

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  external: ['commander', 'formdata-node', '@aws-sdk/*', '@prisma/client', 'prisma'],
  outfile: 'dist/index.js',
});

console.log(
  `[CLI Build] Successfully bundled @abhinavsaha24/migrationguard v${pkg.version} -> dist/index.js`,
);
