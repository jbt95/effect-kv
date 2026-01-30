import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  platform: 'neutral',
  outDir: 'dist',
  // Ensure we don't bundle effect - let it be a peer dependency
  external: ['effect'],
  // Preserve the .js extension for imports
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
