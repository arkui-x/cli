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

const fs = require('fs');
const path = require('path');
const { getConfig } = require('../ace-config');

const {
  Platform,
  platform,
  homeDir
} = require('./platform');

const environment = process.env;

class Sdk {
  constructor(
    type,
    defaultDir,
    kOSHome,
    kOSSdkRoot,
    toolchainsName
  ) {
    this.type = type;
    this.stdType = this.type.toLowerCase();
    this.defaultDir = defaultDir;
    this.kOSHome = kOSHome;
    this.kOSSdkRoot = kOSSdkRoot;
    this.toolchainsName = toolchainsName;
  }

  locateSdk() {
    let sdkHomeDir;
    const config = this.checkConfig();
    if (config) {
      sdkHomeDir = config;
    } else if (this.kOSHome in environment) {
      sdkHomeDir = environment[this.kOSHome].replace(';', '');
    } else if (this.kOSSdkRoot in environment) {
      sdkHomeDir = environment[this.kOSSdkRoot].replace(';', '');
    } else if (platform === Platform.Linux) {
      for (const i in this.defaultDir) {
        const defaultPath = path.join(homeDir, this.defaultDir[i], 'Sdk');
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    } else if (platform === Platform.MacOS) {
      for (const i in this.defaultDir) {
        const defaultPath = path.join(homeDir, 'Library', this.defaultDir[i], 'sdk');
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    } else if (platform === Platform.Windows) {
      for (const i in this.defaultDir) {
        const defaultPath = path.join(homeDir, 'AppData', 'Local', this.defaultDir[i], 'Sdk');
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    }

    if (sdkHomeDir) {
      if (this.validSdkDir(sdkHomeDir)) {
        return sdkHomeDir;
      }
    }

    if (sdkHomeDir) {
      const validSdkPath = path.join(sdkHomeDir, 'sdk');
      if (this.validSdkDir(validSdkPath)) {
        return validSdkPath;
      }
    }
  }

  checkConfig() {
    try {
      const config = getConfig();
      return config[`${this.stdType}-sdk`];
    } catch (err) {
      // ignore
    }
  }

  validSdkDir(dir) {
    return this.validSdkDirLicenses(dir) || this.validSdkDirTools(dir);
  }

  validSdkDirLicenses(dir) {
    return fs.existsSync(path.join(dir, 'licenses'));
  }

  validSdkDirTools(dir) {
    return fs.existsSync(path.join(dir, this.toolchainsName));
  }
}

module.exports = Sdk;
