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
const { getConfig, modifyConfigPath } = require('../ace-config');
const {
  Platform,
  platform,
  homeDir
} = require('./platform');
const { sdkPathCheck } = require('./checkPathLawful');
const { readIdeXmlPath } = require('./Ide');
const { cmpVersion } = require('./util');

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
    let localPropertiesSdkDir;
    const configPath = this.checkConfig();
    if (configPath && sdkPathCheck(configPath, this.type)) {
      sdkHomeDir = configPath;
    } else if (this.kSdkHome in environment && sdkPathCheck(environment[this.kSdkHome].replace(';', ''), this.type)) {
      sdkHomeDir = environment[this.kSdkHome].replace(';', '');
    } else if (this.kSdkRoot in environment && sdkPathCheck(environment[this.kSdkRoot].replace(';', ''), this.type)) {
      sdkHomeDir = environment[this.kSdkRoot].replace(';', '');
    } else if (fs.existsSync('./local.properties')) {
      localPropertiesSdkDir = this.getLocalPropertiesSdkDir('./local.properties');
      if (localPropertiesSdkDir && sdkPathCheck(localPropertiesSdkDir, this.type)) {
        sdkHomeDir = localPropertiesSdkDir;
      }
      if (this.stdType === 'android') {
        localPropertiesSdkDir = this.getLocalPropertiesSdkDir('.arkui-x/android/local.properties');
        if (localPropertiesSdkDir && sdkPathCheck(localPropertiesSdkDir, this.type)) {
          sdkHomeDir = localPropertiesSdkDir;
        }
      }
    }
    if (!sdkHomeDir) {
      if (this.getDefaultSdk()) {
        sdkHomeDir = this.getDefaultSdk();
      } else {
        sdkHomeDir = this.getIdePath();
      }
    }
    modifyConfigPath(this.type, sdkHomeDir);
    if (sdkHomeDir) {
      return sdkHomeDir;
    }
    if (this.type === 'ArkUI-X') {
      const packageArkUIXSdkDir = this.getPackageArkUIXSdkDir();
      modifyConfigPath(this.type, packageArkUIXSdkDir);
      return packageArkUIXSdkDir;
    }
  }

  getDefaultSdk() {
    let sdkHomeDir;
    let defaultPrefixPath = '';
    if (platform === Platform.Windows) {
      defaultPrefixPath = path.join(homeDir, 'AppData', 'Local');
      sdkHomeDir = this.getDefaultSdkPath(defaultPrefixPath);
    } else if (platform === Platform.Linux) {
      defaultPrefixPath = homeDir;
      sdkHomeDir = this.getDefaultSdkPath(defaultPrefixPath);
    } else if (platform === Platform.MacOS) {
      defaultPrefixPath = path.join(homeDir, 'Library');
      sdkHomeDir = this.getDefaultSdkPath(defaultPrefixPath);
    }
    return sdkHomeDir;
  }

  getDefaultSdkPath(defaultPrefixPath) {
    let localSdkName;
    let defaultSdkPath;
    if (this.type === 'OpenHarmony') {
      localSdkName = 'OpenHarmony';
    } else if (this.type === 'HarmonyOS') {
      localSdkName = 'Huawei';
    } else if (this.type === 'ArkUI-X') {
      localSdkName = 'ArkUI-X';
    } else if (this.type === 'Android') {
      localSdkName = 'Android';
    }
    defaultPrefixPath = path.join(defaultPrefixPath, localSdkName);
    defaultSdkPath = path.join(defaultPrefixPath, 'Sdk');
    if (sdkPathCheck(defaultSdkPath, this.type)) {
      return defaultSdkPath;
    } else {
      defaultSdkPath = path.join(defaultPrefixPath, 'sdk');
      if (sdkPathCheck(defaultSdkPath, this.type)) {
        return defaultSdkPath;
      }
    }
  }

  getIdePath() {
    let sdkIdePath;
    let sdkHomeDir;
    const devecoStudio = 'DevEcoStudio';
    const androidStudio = 'AndroidStudio';
    if (this.type === 'HarmonyOS') {
      sdkIdePath = readIdeXmlPath('huawei.sdk.location', devecoStudio);
    }
    if (this.type === 'OpenHarmony') {
      sdkIdePath = readIdeXmlPath('oh.sdk.location', devecoStudio);
    }
    if (this.type === 'ArkUI-X') {
      sdkIdePath = readIdeXmlPath('arkuix.sdk.location', devecoStudio);
    }
    if (this.type === 'Android') {
      sdkIdePath = readIdeXmlPath('android.sdk.path', androidStudio);
    }
    if (sdkIdePath && sdkPathCheck(sdkIdePath, this.type)) {
      sdkHomeDir = sdkIdePath;
    }
    return sdkHomeDir;
  }

  getLocalPropertiesSdkDir(filePath) {
    let content;
    let sdkDir;
      try {
        content = fs.readFileSync(filePath, 'utf8');
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
          if (strArray[1].includes('Huawei')) {
            localSdkDir = 'harmonyos';
          }
          if (strArray[1].includes('Android')) {
            localSdkDir = 'android';
          }
          if (this.stdType === localSdkDir) {
            sdkDir = strArray[1];
            if (platform === Platform.Windows) {
              sdkDir = sdkDir.replace(/\//g, '\\');
            }
            return sdkDir;
          }
        });
      } catch (error) {
        console.error('get local properties error : ' + error);
      }
      return sdkDir;
  }

  getPackageArkUIXSdkDir() {
    const currentPath = __dirname;
    let targetPath = path.join(currentPath, '..', '..', '..', '..', 'arkui-x.json');
    if (fs.existsSync(targetPath)) {
      targetPath = path.join(targetPath, '..', '..', '..');
      if (sdkPathCheck(targetPath, this.type)) {
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

function maxVersion(versionList) {
  if (versionList.length === 1) {
    return versionList[0];
  } else {
    for (let i = 0; i < versionList.length - 1; i++) {
      if (cmpVersion(versionList[i], versionList[i + 1])) {
        const tmp = versionList[i];
        versionList[i] = versionList[i + 1];
        versionList[i + 1] = tmp;
      }
    }
    return versionList[versionList.length - 1];
  }
}

function getOpenHarmonySdkVersion(sdkDir) {
  const versionList = [];
  let openHarmonySdkPath;
  if (!sdkDir) {
    return 'unknown';
  }
  fs.readdirSync(sdkDir).forEach(dir => {
    if (!isNaN(dir) && fs.statSync(path.join(sdkDir, dir)).isDirectory() && dir !== 'licenses') {
      openHarmonySdkPath = path.join(sdkDir, dir, 'ets', 'oh-uni-package.json');
      if (fs.existsSync(openHarmonySdkPath)) {
        const ophenHarmonySdkVersion = JSON5.parse(fs.readFileSync(openHarmonySdkPath))['version'];
        versionList.push(ophenHarmonySdkVersion);
      }
    }
  });
  if (versionList.length !== 0) {
    return maxVersion(versionList);
  } else {
    return 'unknown';
  }
}

function getArkuiXSdkVersion(sdkDir) {
  const versionList = [];
  let arkuiXSdkPath;
  if (!sdkDir || !fs.existsSync(sdkDir)) {
    return 'unknown';
  }
  fs.readdirSync(sdkDir).forEach(dir => {
    if (!isNaN(dir) && fs.statSync(path.join(sdkDir, dir)).isDirectory() && dir !== 'licenses') {
      arkuiXSdkPath = path.join(sdkDir, dir, 'arkui-x', 'arkui-x.json');
      if (fs.existsSync(arkuiXSdkPath)) {
        const arkuiXSdkVersion = JSON5.parse(fs.readFileSync(arkuiXSdkPath))['version'];
        versionList.push(arkuiXSdkVersion);
      }
    }
  });
  if (versionList.length !== 0) {
    return maxVersion(versionList);
  } else {
    return 'unknown';
  }
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
      if (cmpVersion(file, target)) {
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
    return maxVersion(versionList);
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
          if (cmpVersion(file, target)) {
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
  androidSdk
};
