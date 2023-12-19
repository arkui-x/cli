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
const path = require('path');
const { getConfig } = require('../ace-config');
const Process = require('child_process');

function checkNodejs() {
  const environment = process.env;
  const config = getConfig();
  if (config && config['nodejs-dir']) {
    return config['nodejs-dir'];
  } else if ('NODE_HOME' in environment) {
    return environment['NODE_HOME'].replace(';', '');
  }
}

function getNodejsVersion() {
  let nodejsVersion = '';
  let nodeDir = checkNodejs();
  if (fs.existsSync(nodeDir)) {
    if (fs.statSync(nodeDir).isFile()) {
      try {
        nodejsVersion = Process.execSync(`${nodeDir} -v`, { stdio: 'pipe' }).toString().replace(/[\r\n]+/g, '');
      } catch (err) {
        // ignore
      }
    } else {
      let nodePath = path.join(nodeDir, 'bin', 'node');
      if (fs.existsSync(nodePath)) {
        try {
          nodejsVersion = Process.execSync(`${nodePath} -v`, { stdio: 'pipe' }).toString().replace(/[\r\n]+/g, '');
        } catch (err) {
          // ignore
        }
      } else {
        nodePath = path.join(nodeDir, 'node');
        try {
          nodejsVersion = Process.execSync(`${nodePath} -v`, { stdio: 'pipe' }).toString().replace(/[\r\n]+/g, '');
        } catch (err) {
          // ignore
        }
      }
    }
  }
  if (!nodejsVersion) {
    try {
      let nodejsVersion = Process.execSync(`node -v`, { stdio: 'pipe' }).toString().replace(/\n/g, '');
      nodejsVersion = nodejsVersion.replace(/\r/g, '');
      return nodejsVersion;
    } catch (err) {
      return '';
    }
  }
  return nodejsVersion;
}

module.exports = {
  checkNodejs,
  getNodejsVersion
};
