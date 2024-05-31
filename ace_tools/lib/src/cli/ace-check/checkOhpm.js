/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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
const { Platform, platform, homeDir } = require('./platform');
const Process = require('child_process');
const { getConfig, modifyConfigPath } = require('../ace-config');
const { ohpmDirPathCheck } = require('./checkPathLawful');
const { readIdeXmlPath } = require('./Ide');

function checkOhpm() {
  let ohpmDir;
  let getIdePath;
  const config = getConfig();
  const environment = process.env;
  const globalohpm = getGlobalOhpm();
  if (config && config['ohpm-dir'] && ohpmDirPathCheck(config['ohpm-dir'])) {
    ohpmDir = config['ohpm-dir'];
  } else if ('OHPM_HOME' in environment && ohpmDirPathCheck(environment['OHPM_HOME'].replace(';', ''))) {
    ohpmDir = environment['OHPM_HOME'].replace(';', '');
  } else if (globalohpm) {
    ohpmDir = globalohpm;
  } else if (getDefaultOhpm()) {
    ohpmDir = getDefaultOhpm();
  } else {
    getIdePath = readIdeXmlPath('ace.ohpm.path', 'DevEcoStudio');
    if (getIdePath && ohpmDirPathCheck(getIdePath)) {
      ohpmDir = getIdePath;
    }
  }
  modifyConfigPath('ohpm-dir', ohpmDir);
  if (ohpmDir) {
    return ohpmDir;
  }
}

function getDefaultOhpm() {
  const ohpmPaths = path.join(homeDir, 'ohpm');
  if (!fs.existsSync(ohpmPaths)) {
    return undefined;
  }
  const files = fs.readdirSync(ohpmPaths);
  const numOfFile = files.length;
  if (!files || numOfFile <= 0) {
    return undefined;
  }
  for (let i = 0; i < numOfFile; i++) {
    const targetPath = path.join(ohpmPaths, files[i]);
    if (ohpmDirPathCheck(targetPath)) {
      return targetPath;
    }
  }
  return undefined;
}

function getGlobalOhpm() {
  let ohpmDir;
  if (platform === Platform.Windows) {
    try {
      ohpmDir = path.parse(Process.execSync(`where ohpm`, { stdio: 'pipe' }).toString().split(/\r\n/g)[0]).dir;
    } catch (err) {
      // ignore
    }
  } else if (platform === Platform.MacOS) {
    try {
      ohpmDir = path.parse(Process.execSync(`which ohpm`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
    } catch (err) {
      // ignore
    }
  } else if (platform === Platform.Linux) {
    try {
      ohpmDir = path.parse(Process.execSync(`which ohpm`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
    } catch (err) {
      // ignore
    }
  }
  if (ohpmDir) {
    ohpmDir = path.dirname(ohpmDir);
    return ohpmDir;
  }
}

module.exports = checkOhpm;
