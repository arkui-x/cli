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
const { Platform, platform } = require('./platform');
const Process = require('child_process');
const { getConfig } = require('../ace-config');

function checkOhpm() {
  const environment = process.env;
  const config = getConfig();
  let ohpmDir;
  if (config && config['ohpm-dir']) {
    ohpmDir = config['ohpm-dir'];
    if (validOhpmDir(ohpmDir)) {
      return ohpmDir;
    }
  }
  if ('OHPM_HOME' in environment) {
    ohpmDir = environment['OHPM_HOME'].replace(';', '');
    if (validOhpmDir(ohpmDir)) {
      return ohpmDir;
    } 
  }
  return getGlobalOhpm();
}

function getGlobalOhpm() {
  let ohpmDir;
  if (platform === Platform.Windows) {
    try {
      ohpmDir = path.parse(Process.execSync(`where ohpm`, { stdio: 'pipe' }).toString().split(/\r\n/g)[0]).dir;
    } catch (err) {
      //ignore
    }
  } else if (platform === Platform.MacOS) {
    try {
      ohpmDir = path.parse(Process.execSync(`which ohpm`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
    } catch (err) {
      //ignore
    }
  } else if (platform === Platform.Linux) {
    try {
      ohpmDir = path.parse(Process.execSync(`which ohpm`, { stdio: 'pipe' }).toString().replace(/\n/g, '')).dir;
    } catch (err) {
      //ignore
    }
  }
  if(ohpmDir) {
    ohpmDir = path.dirname(ohpmDir);
    ohpmDir = path.dirname(ohpmDir);
    return ohpmDir;
  }
}

function validOhpmDir(ohpmDir) {
  if (!fs.existsSync(ohpmDir)) {
    return false;
  }
  let execPath = path.join(ohpmDir, 'bin', 'ohpm');
  if(!fs.existsSync(execPath) || !fs.statSync(execPath).isFile()) {
    return false;
  }
  try {
    Process.execSync(`${execPath} -v`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return true;
  } catch (err) {
    console.log(err);
  }
  return false;
}

module.exports = checkOhpm;
