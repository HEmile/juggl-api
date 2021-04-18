import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.module,
      format: 'es',
      name: 'juggl-api',
      globals: 'obsidian',
    },
    {
      file: pkg.main,
      format: 'umd',
      name: 'juggl-api',
      globals: 'obsidian',
    },
  ],
  external: ['obsidian'],
  plugins: [
    commonjs({
      include: ['/node_modules/'],
    }),
    typescript({sourceMap: true}),
    nodeResolve({browser: true,
      dedupe: ['svelte']}),
  ],
};
