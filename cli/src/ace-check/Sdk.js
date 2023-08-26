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
    toolchainsName,
    getVersion,
  ) {
    this.type = type;
    this.stdType = this.type.toLowerCase();
    this.defaultSdkDir = defaultSdkDir;
    this.kSdkHome = kSdkHome;
    this.kSdkRoot = kSdkRoot;
    this.toolchainsName = toolchainsName;
    this.getVersion = getVersion;
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
    if(this.stdType === 'ArkUI-X') {
      return this.getPackageArkUIXSdkDir();
    }
  }

  getPackageArkUIXSdkDir() {
    let currentPath = __dirname;
    let targetPath = path.join(currentPath, '..', '..', '..', '..', 'arkui-x.json');
    if(fs.existsSync(targetPath)) {
      targetPath = path.join(targetPath, '..', '..', '..');
      if(ArkUIXSdkPathCheck(targetPath)) {
        return targetPath;
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


function isVersionValid(version, limit) {
  let subVersions = version.split('.');
  if(subVersions.length != limit) {
    return false;
  }
  for(let i = 0; i < limit; i++) {
    if(isNaN(subVersions[i])) {
      return false;
    }
  }
  return true;
}

function cmpVersion(version1, version2) {
  let subVersions1 = version1.split('.');
  let subVersions2 = version2.split('.');
  let limit = subVersions1.length;
  for(let i = 0; i < limit; i++){
    if(parseInt(subVersions1[i]) == parseInt(subVersions2[i])) {
      continue;
    }
    if(parseInt(subVersions1[i]) > parseInt(subVersions2[i])) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
}

function getOpenHarmonySdkVersion(sdkDir) {
  if(!sdkDir) {
    return 'unknown';
  }
  const files = fs.readdirSync(sdkDir);
  let numOfFile = files.length
  if(!files || numOfFile <= 0) {
    return 'unknown';
  }
  let target = '0';
  files.forEach((file) => {
    if(!isNaN(file) && parseInt(file) > parseInt(target)) {
      target = file
    }
  })
  let targetPath = path.join(sdkDir, target, 'ets', 'oh-uni-package.json');
  if(!fs.existsSync(targetPath)) {
    return 'unknown';
  }
  return JSON.parse(fs.readFileSync(targetPath))['version'];
}

function getArkuiXSdkVersion(sdkDir) {
  if (!sdkDir || !fs.existsSync(sdkDir)) {
    return 'unknown';
  }
  const files = fs.readdirSync(sdkDir);
  let numOfFile = files.length
  if(!files || numOfFile <= 0) {
    return 'unknown';
  }
  let target = '0';
  files.forEach((file) => {
    if(!isNaN(file) && parseInt(file) > parseInt(target)) {
      target = file
    }
  })
  let targetPath = path.join(sdkDir, target, 'arkui-x', 'arkui-x.json');
  if(!fs.existsSync(targetPath)) {
    return 'unknown';
  }
  return JSON.parse(fs.readFileSync(targetPath))['version'];
}

function getAndroidSdkVersion(sdkDir) {
  if (!sdkDir|| !fs.existsSync(path.join(sdkDir, 'build-tools'))) {
    return 'unknown';
  }
  const files = fs.readdirSync(path.join(sdkDir, 'build-tools'));
  let numOfFile = files.length;
  if(!files || numOfFile <= 0) {
    return 'unknown';
  }
  let target = '0.0.0';
  let sign = false;
  files.forEach((file) => {
    if(isVersionValid(file, 3)) {
      if(cmpVersion(file,target) > 0) {
        sign = true;
        target = file;
      }
    }
  })
  if(sign) {
    return target;  
  }
  return 'unknown';
}

function getHarmonyOsSdkVersion(sdkDir) {
  if(!sdkDir || !fs.existsSync(path.join(sdkDir, 'hmscore'))) {
    return 'unknown';
  }
  const files = fs.readdirSync(path.join(sdkDir, 'hmscore'));
  let numOfFile = files.length;
  if(!files || numOfFile <= 0) {
    return 'unknown';
  }
  let target = '0.0.0';
  let sign = false;
  files.forEach((file) => {
    if(isVersionValid(file, 3)) {
      if(cmpVersion(file,target) > 0) {
        sign = true;
        target = file;
      }
    }
  })
  if(sign) {
    return target;  
  }
  return 'unknown';
}

const openHarmonySdk = new Sdk(
  'OpenHarmony',
  ['OpenHarmony'],
  'OpenHarmony_HOME',
  'OpenHarmony',
  'toolchains',
  getOpenHarmonySdkVersion
);

const harmonyOsSdk = new Sdk(
  'HarmonyOS',
  ['Huawei'],
  'HarmonyOS_HOME',
  'HarmonyOS',
  'toolchains',
  getHarmonyOsSdkVersion
);
const arkuiXSdk = new Sdk(
  'ArkUI-X',
  ['ArkUI-X'],
  'ARKUIX_SDK_HOME',
  'ArkUI-X',
  'toolchains',
  getArkuiXSdkVersion
);

const androidSdk = new Sdk(
  'Android',
  ['Android'],
  'ANDROID_HOME',
  'Android',
  'platform-tools',
  getAndroidSdkVersion
);

module.exports = {
  openHarmonySdk,
  harmonyOsSdk,
  arkuiXSdk,
  androidSdk
};
