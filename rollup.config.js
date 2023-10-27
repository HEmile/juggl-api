import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json' assert {type: 'json'};
import json from '@rollup/plugin-json';

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
    json(),
    typescript({sourceMap: true}),
    nodeResolve({browser: true,
      dedupe: ['svelte']}),
  ],
};
