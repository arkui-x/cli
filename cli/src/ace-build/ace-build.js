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

const fs = require('fs');

const {
  Platform,
  platform
} = require('../ace-check/platform');
const { getConfig } = require('../ace-config');
const config = getConfig();
const { copy } = require('../ace-create/project');

function createLocalProperties(filePath, content) {
  if (platform === Platform.Windows) {
    content = content.replace(/\\/g, '/');
    content = content.replace(/\//g, '\\\\');
    content = content.replace(/:/g, '\\:');
  }
  try {
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error('Write local.properties failed.');
    return false;
  }
  return true;
}

function copyToBuildDir(src) {
  if (config && Object.prototype.hasOwnProperty.call(config, 'build-dir')) {
    const buildDir = config['build-dir'];
    copy(src, buildDir);
    return buildDir;
  } else {
    return src;
  }
}

module.exports = {
  config,
  createLocalProperties,
  copyToBuildDir
};
