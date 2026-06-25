/*
 * Copyright (c) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import shebang from 'rollup-plugin-preserve-shebang';

const path = require('path');
const fs = require('fs');

const argv = process.argv;
const distPath = argv[5] || path.join(__dirname, 'dist');
const templatePath = path.join(__dirname, 'templates');
const distTemplatePath = path.join(distPath, 'templates');

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath);
}
if (!fs.existsSync(distTemplatePath)) {
  fs.mkdirSync(distTemplatePath);
}

copy(templatePath, distTemplatePath);

function copy(src, dst) {
  const paths = fs.readdirSync(src);
  paths.forEach(function(_path) {
    const _src = src + '/' + _path;
    const _dst = dst + '/' + _path;
    if (fs.statSync(_src).isFile()) {
      fs.writeFileSync(_dst, fs.readFileSync(_src));
    } else {
      if (!fs.existsSync(_dst)) {
        fs.mkdirSync(_dst);
      }
      copy(_src, _dst);
    }
  });
}

export default {
  input: 'lib/ace_tools.js',
  output: {
    file: path.join(distPath, 'lib', 'ace_tools.js'),
    format: 'umd',
    name: 'ace_tools',
    sourcemap: true,
    globals: {
      'path': 'path',
      'child_process': 'child_process',
      'fs': 'fs',
      'process': 'process',
      'os': 'os',
      'crypto': 'crypto',
      'events': 'events',
      'readline': 'readline',
      'tty': 'tty',
      'stream': 'stream',
      'assert': 'assert',
      'buffer': 'buffer',
      'util': 'util',
      'string_decoder': 'string_decoder',
    },
    sourcemap: false,
  },
  plugins: [
    shebang('#!/usr/bin/env node'),
    json(),
    resolve({
      preferBuiltins: true,
    }),
    commonjs({
      ignore: ['conditional-runtime-dependency'],
      requireReturnsDefault: true,
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    terser()
  ],
};
