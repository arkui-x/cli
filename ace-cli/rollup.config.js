/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
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

import resolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import shebang from 'rollup-plugin-preserve-shebang';
const path = require('path');
const fs = require('fs');
const templatePath = path.join(__dirname, 'src/ace-create/template');
const distPath = path.join(__dirname, 'dist/template');

if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.mkdirSync(path.join(__dirname, 'dist'));
}
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath);
}

fs.writeFileSync(path.join(__dirname, 'dist/ace'), fs.readFileSync(path.join(__dirname, 'src/bin/ace')));
fs.writeFileSync(path.join(__dirname, 'dist/ace.cmd'), fs.readFileSync(path.join(__dirname, 'src/bin/ace.cmd')));
fs.writeFileSync(path.join(__dirname, 'dist/ace.ps1'), fs.readFileSync(path.join(__dirname, 'src/bin/ace.ps1')));
copy(templatePath, distPath);

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
  input: 'src/bin/ace_tools.js',
  output: {
    file: 'dist/ace_tools.js',
    format: 'umd',
    name: 'ace_tools',
    sourcemap: true
  },
  plugins: [
    shebang('#!/usr/bin/env node'),
    json(),
    resolve(),
    commonjs({
      ignore: ['conditional-runtime-dependency']
    }),
    babel({
      exclude: 'node_modules/**'
    }),
    terser()
  ]
};
