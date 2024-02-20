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
const JSON5 = require('json5');
const { getConfig, arkUIXSdkPathCheck } = require('../ace-config');

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
    getVersion
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

      let content;
      try {
        content = fs.readFileSync('./local.properties', 'utf8');
        content.split(/\r?\n/).forEach(line => {
          var strArray;
          if (line.startsWith('#')) {
            return;
          }
          strArray = line.split('=');
          let localSdkDir = strArray[0].split('.')[0];
          if (strArray[1].includes('OpenHarmony')) {
            localSdkDir = 'openharmony';
          }
          if (strArray[1].includes('Android')) {
            localSdkDir = 'android';
          }
          if (strArray[1].includes('Huawei')) {
            localSdkDir = 'harmonyos';
          }
          if (this.stdType === localSdkDir) {
            sdkHomeDir = strArray[1];
            sdkHomeDir = sdkHomeDir.replace(/\//g, '\\');
          }
        });
      } catch (error) {
        console.error('get local properties error : ' + error);
      }
    }

    if (sdkHomeDir) {
      if (this.validSdkDir(sdkHomeDir)) {
        return sdkHomeDir;
      }
    }
    if (this.stdType === 'ArkUI-X') {
      return this.getPackageArkUIXSdkDir();
    }
  }

  getPackageArkUIXSdkDir() {
    const currentPath = __dirname;
    let targetPath = path.join(currentPath, '..', '..', '..', '..', 'arkui-x.json');
    if (fs.existsSync(targetPath)) {
      targetPath = path.join(targetPath, '..', '..', '..');
      if (arkUIXSdkPathCheck(targetPath)) {
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
    if (this.type === 'ArkUI-X') {
      return arkUIXSdkPathCheck(dir);
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
  const subVersions = version.split('.');
  if (subVersions.length !== limit) {
    return false;
  }
  for (let i = 0; i < limit; i++) {
    if (isNaN(subVersions[i])) {
      return false;
    }
  }
  return true;
}

function cmpVersion(version1, version2) {
  const subVersions1 = version1.split('.');
  const subVersions2 = version2.split('.');
  const limit = subVersions1.length;
  for (let i = 0; i < limit; i++) {
    if (parseInt(subVersions1[i]) === parseInt(subVersions2[i])) {
      continue;
    }
    if (parseInt(subVersions1[i]) > parseInt(subVersions2[i])) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
}

function getOpenHarmonySdkVersion(sdkDir) {
  if (!sdkDir) {
    return 'unknown';
  }
  const files = fs.readdirSync(sdkDir);
  const numOfFile = files.length;
  if (!files || numOfFile <= 0) {
    return 'unknown';
  }
  let target = '0';
  files.forEach((file) => {
    if (!isNaN(file) && parseInt(file) > parseInt(target)) {
      target = file;
    }
  });
  const targetPath = path.join(sdkDir, target, 'ets', 'oh-uni-package.json');
  if (!fs.existsSync(targetPath)) {
    return 'unknown';
  }
  return JSON.parse(fs.readFileSync(targetPath))['version'];
}

function getArkuiXSdkVersion(sdkDir) {
  if (!sdkDir || !fs.existsSync(sdkDir)) {
    return 'unknown';
  }
  const files = fs.readdirSync(sdkDir);
  const numOfFile = files.length;
  if (!files || numOfFile <= 0) {
    return 'unknown';
  }
  let target = '0';
  files.forEach((file) => {
    if (!isNaN(file) && parseInt(file) > parseInt(target)) {
      target = file;
    }
  });
  const targetPath = path.join(sdkDir, target, 'arkui-x', 'arkui-x.json');
  if (!fs.existsSync(targetPath)) {
    return 'unknown';
  }
  return JSON.parse(fs.readFileSync(targetPath))['version'];
}

function getAndroidSdkVersion(sdkDir) {
  if (!sdkDir || !fs.existsSync(path.join(sdkDir, 'build-tools'))) {
    return 'unknown';
  }
  const files = fs.readdirSync(path.join(sdkDir, 'build-tools'));
  const numOfFile = files.length;
  if (!files || numOfFile <= 0) {
    return 'unknown';
  }
  let target = '0.0.0';
  let sign = false;
  files.forEach((file) => {
    if (isVersionValid(file, 3)) {
      if (cmpVersion(file, target) > 0) {
        sign = true;
        target = file;
      }
    }
  });
  if (sign) {
    return target;
  }
  return 'unknown';
}

function getHarmonyOsSdkVersion(sdkDir) {
  if (!sdkDir) {
    return 'unknown';
  }
  const versionList = [];
  fs.readdirSync(sdkDir).forEach(dir => {
    if (dir.includes('HarmonyOS')) {
      const platformVersion = JSON5.parse(fs.readFileSync(
        path.join(sdkDir, dir, 'sdk-pkg.json'))).data.platformVersion;
      versionList.push(platformVersion);
    }
  });
  if (versionList.length !== 0) {
    if (versionList.length === 1) {
      return versionList[0];
    } else {
      for (let i = 0; i < versionList.length - 1; i++) {
        if (cmpVersion(versionList[i], versionList[i + 1]) > 0) {
          let tmp = versionList[i];
          versionList[i] = versionList[i + 1];
          versionList[i + 1] = tmp;
        }
      }
      return versionList[versionList.length - 1];
    }
  } else {
    if (fs.existsSync(path.join(sdkDir, 'hmscore'))) {
      const files = fs.readdirSync(path.join(sdkDir, 'hmscore'));
      const numOfFile = files.length;
      if (!files || numOfFile <= 0) {
        return 'unknown';
      }
      let target = '0.0.0';
      let sign = false;
      files.forEach((file) => {
        if (isVersionValid(file, 3)) {
          if (cmpVersion(file, target) > 0) {
            sign = true;
            target = file;
          }
        }
      });
      if (sign) {
        return target;
      }
      return 'unknown';
    }
  }
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
  androidSdk,
  cmpVersion
};
