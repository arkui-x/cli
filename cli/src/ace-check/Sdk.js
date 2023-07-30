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
const { getConfig,ArkUIXSdkPathCheck } = require('../ace-config');

const {
  Platform,
  platform,
  homeDir
} = require('./platform');

const environment = process.env;

class Sdk {
  constructor(
    type,
    defaultSdkDir,
    kSdkHome,
    kSdkRoot,
    toolchainsName
  ) {
    this.type = type;
    this.stdType = this.type.toLowerCase();
    this.defaultSdkDir = defaultSdkDir;
    this.kSdkHome = kSdkHome;
    this.kSdkRoot = kSdkRoot;
    this.toolchainsName = toolchainsName;
  }
  locateSdk() {
    let sdkHomeDir;
    const config = this.checkConfig();
    if (config) {
      sdkHomeDir = config;
    } else if (this.kSdkHome in environment) {
      sdkHomeDir = environment[this.kSdkHome].replace(';', '');
    } else if (this.kSdkRoot in environment) {
      sdkHomeDir = environment[this.kSdkRoot].replace(';', '');
    } else if (platform === Platform.Linux) {
      for (const i in this.defaultSdkDir) {
        const defaultPath = path.join(homeDir, this.defaultSdkDir[i], 'Sdk');
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    } else if (platform === Platform.MacOS) {
      for (const i in this.defaultSdkDir) {
        const defaultPath = path.join(homeDir, 'Library', this.defaultSdkDir[i], 'Sdk');
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    } else if (platform === Platform.Windows) {
      for (const i in this.defaultSdkDir) {
        const defaultPath = path.join(homeDir, 'AppData', 'Local', this.defaultSdkDir[i], 'Sdk');
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

  locateSdkNoSub() {
    let sdkHomeDir;
    const config = this.checkConfig();
    if (config) {
      sdkHomeDir = config;
    } else if (this.kSdkHome in environment) {
      sdkHomeDir = environment[this.kSdkHome].replace(';', '');
    } else if (this.kSdkRoot in environment) {
      sdkHomeDir = environment[this.kSdkRoot].replace(';', '');
    } else if (platform === Platform.Linux) {
      for (const i in this.defaultSdkDir) {
        const defaultPath = path.join(homeDir, this.defaultSdkDir[i]);
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    } else if (platform === Platform.MacOS) {
      for (const i in this.defaultSdkDir) {
        const defaultPath = path.join(homeDir, 'Library', this.defaultSdkDir[i]);
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    } else if (platform === Platform.Windows) {
      for (const i in this.defaultSdkDir) {
        const defaultPath = path.join(homeDir, 'AppData', 'Local', this.defaultSdkDir[i]);
        if (fs.existsSync(defaultPath)) {
          sdkHomeDir = defaultPath;
        }
      }
    }
    if (sdkHomeDir) {
      if(this.kSdkRoot === 'ArkUI-X') {
        if(ArkUIXSdkPathCheck(sdkHomeDir)) {
          return sdkHomeDir;
        }
      } else if (this.validSdkDir(sdkHomeDir)) {
        return sdkHomeDir;
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
