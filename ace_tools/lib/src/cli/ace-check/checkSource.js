/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
const path = require('path');
const { Platform, platform } = require('../ace-check/platform');
const { getConfig } = require('../ace-config');
const { sourceDirPathCheck } = require('../ace-check/checkPathLawful');

function checkPlatform() {
  if (platform === Platform.Windows) {
    return 'windows';
  } else if (platform === Platform.MacOS) {
    return 'darwin';
  } else {
    return 'linux';
  }
}

function getSourceDir() {
  const config = getConfig();
  if (config && config['source-dir'] && sourceDirPathCheck(config['source-dir'])) {
    return config['source-dir'];
  }
  return false;
}

function getSourceArkuixVersion() {
  if (getSourceArkuixPath()) {
    return JSON.parse(fs.readFileSync(path.join(getSourceArkuixPath(), 'arkui-x.json')))['version'];
  }
  return 'unknown';
}

function getSourceArkuixPath() {
  const host = checkPlatform();
  const sourceDirArkuixPath = `out/arkui-x/arkui-x/${host}/arkui-x`;
  const sourceDir = getSourceDir();
  if (!sourceDir || !fs.existsSync(path.join(sourceDir, sourceDirArkuixPath))) {
    return false;
  }
  return path.join(sourceDir, sourceDirArkuixPath);
}

module.exports = {
  checkPlatform,
  getSourceDir,
  getSourceArkuixPath,
  getSourceArkuixVersion,
};

