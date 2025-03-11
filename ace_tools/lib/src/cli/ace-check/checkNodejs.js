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
const { getConfig, modifyConfigPath } = require('../ace-config');
const Process = require('child_process');
const { Platform, platform } = require('./platform');
const { nodejsDirPathCheck } = require('./checkPathLawful');
const { readIdeXmlPath } = require('./Ide');

function checkNodejs() {
  let nodejsDir;
  let getIdePath;
  const config = getConfig();
  const environment = process.env;
  const globalNodejs = getGlobalNodejs();
  if (config && config['nodejs-dir'] && nodejsDirPathCheck(config['nodejs-dir'])) {
    nodejsDir = config['nodejs-dir'];
  } else if ('NODE_HOME' in environment && nodejsDirPathCheck(environment['NODE_HOME'].replace(';', ''))) {
    nodejsDir = environment['NODE_HOME'].replace(';', '');
  } else if (globalNodejs) {
    nodejsDir = globalNodejs;
  } else if (getDefaultNodejs()) {
    nodejsDir = getDefaultNodejs();
  } else {
    getIdePath = readIdeXmlPath('ace.nodejs.path', 'DevEcoStudio');
    if (getIdePath && nodejsDirPathCheck(getIdePath)) {
      nodejsDir = getIdePath;
    }
  }
  modifyConfigPath('nodejs-dir', nodejsDir);
  if (nodejsDir) {
    return nodejsDir;
  }
}

function getGlobalNodejs() {
  let nodejsDir;
  if (platform === Platform.Windows) {
    try {
      nodejsDir = path.parse(Process.execSync(`where node`, { stdio: 'pipe' }).toString().split(/\r\n/g)[0]).dir;
    } catch (err) {
      // ignore
    }
  } else if (platform === Platform.Linux || platform === Platform.MacOS) {
    try {
      nodejsDir = path.parse(Process.execSync(`which node`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
      nodejsDir = path.dirname(nodejsDir);
    } catch (err) {
      // ignore
    }
  }
  if (nodejsDir) {
    return nodejsDir;
  }
}

function getDefaultNodejs() {
  let defaultNodejs;
  const defaultWinsDirs = [`C:\\Program Files`, `D:\\Program Files`];
  const defaultMacAndLinuxDir = '/usr/local/bin';
  if (platform === Platform.Windows) {
    defaultWinsDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        return defaultNodejs;
      }
      const defaultWinsPath = path.join(dir, 'nodejs');
      if (nodejsDirPathCheck(defaultWinsPath)) {
        defaultNodejs = defaultWinsPath;
        return;
      }
    });
  } else if (platform === Platform.Linux || platform === Platform.MacOS) {
    const defaultMacAndLinuxPath = path.dirname(defaultMacAndLinuxDir);
    if (nodejsDirPathCheck(defaultMacAndLinuxPath)) {
      defaultNodejs = defaultMacAndLinuxPath;
    }
  }
  return defaultNodejs;
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
  getNodejsVersion,
};
