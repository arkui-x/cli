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
const process = require('child_process');
const { Platform, platform, homeDir } = require('./platform');
const { getConfig } = require('../ace-config');

function checkOhpm() {
  const config = getConfig();
  let ohpmTool;
  if (config && config['ohpm-dir']) {
    ohpmTool = config['ohpm-dir'];
    if (!validOhpmDir(ohpmTool)) {
      ohpmTool = getOhpm();
    }
  } else {
    ohpmTool = getOhpm();
  }
  return ohpmTool;
}

function getOhpm() {
  let ohpmDir = '';
  if (platform === Platform.Windows) {
    try {
      return path.parse(process.execSync(`where ohpm`, { stdio: 'pipe' }).toString().split(/\r\n/g)[0]).dir;
    } catch (err) {
      const defaultPath = path.join(homeDir, 'AppData/Local/Huawei/ohpm/bin');
      if (fs.existsSync(defaultPath)) {
        ohpmDir = defaultPath;
      }
    }
  } else if (platform === Platform.MacOS) {
    try {
      ohpmDir = path.parse(process.execSync(`which ohpm`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
    } catch (err) {
      const defaultPath = path.join(homeDir, 'Library/Huawei/ohpm/bin');
      if (fs.existsSync(defaultPath)) {
        ohpmDir = defaultPath;
      }
    }
  } else if (platform === Platform.Linux) {
    try {
      ohpmDir = path.parse(process.execSync(`which ohpm`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
    } catch (err) {
      const defaultPath = path.join(homeDir, 'ohpm/bin');
      if (fs.existsSync(defaultPath)) {
        ohpmDir = defaultPath;
      }
    }
  }
  if (validOhpm(ohpmDir, 'ohpm')) {
    return ohpmDir;
  }
}

function validOhpm(ohpmDir, ohpmBaseName) {
  let validPath = path.join(ohpmDir, ohpmBaseName);
  if (fs.existsSync(validPath) && fs.statSync(validPath).isFile()) {
    try {
      process.execSync(`${validPath} -v`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return true;
    } catch (err) {
      // ignore
    }
  }
  return false;
}

function validOhpmDir(ohpmTool) {
  if (fs.existsSync(ohpmTool)) {
    if (validOhpm(ohpmTool, 'ohpm') || validOhpm(ohpmTool, 'bin/ohpm')) {
      return true;
    }
  }
  return false;
}

module.exports = checkOhpm;
