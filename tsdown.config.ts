import swc from 'unplugin-swc';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  platform: 'node',
  outDir: 'dist',
  plugins: [
    swc.rollup({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorVersion: '2022-03', useDefineForClassFields: true },
        target: 'es2019',
        keepClassNames: true,
      },
    }),
  ],
});
