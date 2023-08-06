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
    } else { 
      let defaultPrefixPath = '';
      if (platform === Platform.Linux) {
        defaultPrefixPath = homeDir;
      } else if (platform === Platform.MacOS) {
        defaultPrefixPath = path.join(homeDir, 'Library');
      } else if (platform === Platform.Windows) {
        defaultPrefixPath = path.join(homeDir, 'AppData', 'Local');
      }
      let defaultPath = path.join(defaultPrefixPath, 'Sdk');
      if (fs.existsSync(defaultPath)) {
        sdkHomeDir = defaultPath;
      } else {
        defaultPath = path.join(defaultPrefixPath, 'sdk');
        sdkHomeDir = defaultPath;
      }
    }

    if (sdkHomeDir) {
      if (this.validSdkDir(sdkHomeDir)) {
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
    if(this.type === 'ArkUI-X') {
      return ArkUIXSdkPathCheck(dir);
    }
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
