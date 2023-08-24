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

const {
  Platform,
  platform,
  homeDir
} = require('./platform');
const Sdk = require('./Sdk');
const Ide = require('./Ide');
const {checkNodejs, getNodejsVersion} = require('./checkNodejs');
const checkOhpm = require('./checkOhpm');
const { checkXcodeVersion, checkIdeviceVersion, checkDeployVersion } = require('./checkAppVersion');
const { getJavaVersion, getJavaSdkDirInEnv, getJavaSdkDirInIde} = require('./checkJavaSdk');
const fs = require('fs');
const path = require('path');
const Process = require('child_process');

const openHarmonySdk = new Sdk(
  'OpenHarmony',
  ['OpenHarmony'],
  'OpenHarmony_HOME',
  'OpenHarmony',
  'toolchains'
);

const harmonyOsSdk = new Sdk(
  'HarmonyOS',
  ['Huawei'],
  'HarmonyOS_HOME',
  'HarmonyOS',
  'toolchains'
);
const arkuiXSdk = new Sdk(
  'ArkUI-X',
  ['ArkUI-X'],
  'ARKUIX_SDK_HOME',
  'ArkUI-X',
  'toolchains'
);

const devEcoStudio = new Ide(
  'DevEco Studio',
  [`/opt/deveco-studio`, `${homeDir}/deveco-studio`],
  [],
  [`C:\\Program Files\\Huawei\\DevEco Studio`,
    `D:\\Program Files\\Huawei\\DevEco Studio`],
  'devecostudio'
);

const androidStudio = new Ide(
  'Android Studio',
  [`/opt/android-studio`, `${homeDir}/android-studio`],
  [],
  [`C:\\Program Files\\Android\\Android Studio`,
    `D:\\Program Files\\Android\\Android Studio`],
  'androidstudio'
);

const androidSdk = new Sdk(
  'Android',
  ['Android'],
  'ANDROID_HOME',
  'Android',
  'platform-tools'
);

const openHarmonySdkDir = openHarmonySdk.locateSdk();
const openHarmonySdkVersion = getOpenHarmonySdkVersion();

const harmonyOsSdkDir = harmonyOsSdk.locateSdk();
const harmonyOsSdkVersion = getHarmonyOsSdkVersion();

const arkuiXSdkDir = arkuiXSdk.locateSdk();
const arkuiXSdkVersion = getArkuiXSdkVersion();

const androidSdkDir = androidSdk.locateSdk();
const androidSdkVersion = getAndroidSdkVersion();

const nodejsDir = checkNodejs();
const nodejsVersion = getNodejsVersion();
const ohpmDir = checkOhpm();

const devEcoStudioDir = devEcoStudio.locateIde();
const devEcoStudioVersion = getStudioVersion(devEcoStudioDir);

const androidStudioDir = androidStudio.locateIde();
const androidStudioVersion = getStudioVersion(androidStudioDir);
const xCodeVersion = checkXcodeVersion();
const xCodeDir = getxCodeDir();
const iDeviceVersion = checkIdeviceVersion();
const deployVersion = checkDeployVersion();

const javaSdkDirUser = getJavaSdkDirInEnv();
const javaSdkDirAndroid = getJavaSdkDirInIde(androidStudioDir) || javaSdkDirUser;
const javaSdkDirDevEco = getJavaSdkDirInIde(devEcoStudioDir) || javaSdkDirUser;
const javaSdkVersionUser = javaSdkDirUser ? getJavaVersion(path.join(javaSdkDirUser, 'bin')) : undefined;
const javaSdkVersionAndroid = javaSdkDirAndroid ? getJavaVersion(path.join(javaSdkDirAndroid, 'bin')) : undefined || javaSdkVersionUser;
const javaSdkVersionDevEco = javaSdkDirDevEco ? getJavaVersion(path.join(javaSdkDirDevEco, 'bin')) : undefined || javaSdkVersionUser;

function getxCodeDir() {
  if (platform === Platform.MacOS) {
    const xCodeDirlist = ['/Applications/Xcode.app', path.join(homeDir, '/Applications', `Xcode.app`)];
    for (const i in xCodeDirlist) {
      if (fs.existsSync(xCodeDirlist[i])) {
        return xCodeDirlist[i];
      }
    }
  }
  return undefined;
}

function getOpenHarmonySdkVersion() {
  if(!openHarmonySdkDir) {
    return 'unknown';
  }
  const files = fs.readdirSync(openHarmonySdkDir);
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
  let targetPath = path.join(openHarmonySdkDir, target, 'ets', 'oh-uni-package.json');
  if(!fs.existsSync(targetPath)) {
    return 'unknown';
  }
  return JSON.parse(fs.readFileSync(targetPath))['version'];
}

function getArkuiXSdkVersion() {
  if(!arkuiXSdkDir) {
    return 'unknown';
  }
  if (!fs.existsSync(arkuiXSdkDir)) {
    return 'unknown';
  }
  const files = fs.readdirSync(arkuiXSdkDir);
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
  let targetPath = path.join(arkuiXSdkDir, target, 'arkui-x', 'arkui-x.json');
  if(!fs.existsSync(targetPath)) {
    return 'unknown';
  }
  return JSON.parse(fs.readFileSync(targetPath))['version'];
}

function isVersionValid(version, limit) {
  subVersions = version.split('.');
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

function getAndroidSdkVersion() {
  if(!androidSdkDir) {
    return 'unknown';
  }
  if (!fs.existsSync(path.join(androidSdkDir, 'build-tools'))) {
    return 'unknown';
  }
  const files = fs.readdirSync(path.join(androidSdkDir, 'build-tools'));
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

function getHarmonyOsSdkVersion() {
  if(!harmonyOsSdkDir) {
    return 'unknown';
  }
  if (!fs.existsSync(path.join(harmonyOsSdkDir, 'hmscore'))) {
    return 'unknown';
  }
  const files = fs.readdirSync(path.join(harmonyOsSdkDir, 'hmscore'));
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

function getStudioVersion(studioDir) {
  if(!studioDir) {
    return 'unknown';
  }
  if (studioDir.endsWith('bin')) {
    studioDir = studioDir.substring(0, studioDir.length - 3);
  }
  if(platform === Platform.MacOS) {
    let targetPath = path.join(studioDir, 'Contents', 'Info.plist');
    if(!fs.existsSync(targetPath)) {
      return 'unknown';
    }
    try {
      return Process.execSync(`defaults read "${targetPath}" CFBundleShortVersionString`, { stdio: 'pipe' }).toString().replace(/\n/g, '');
    } catch (err) {
      return 'unknown';
    }
  } else if(platform === Platform.Windows) {
    let targetPath = path.join(studioDir, 'product-info.json');
    if(!fs.existsSync(targetPath)) {
      return 'unknown';
    }
    return JSON.parse(fs.readFileSync(targetPath))['version'];
  }
}

module.exports = {
  openHarmonySdkDir,
  openHarmonySdkVersion,
  harmonyOsSdkDir,
  harmonyOsSdkVersion,
  nodejsDir,
  nodejsVersion,
  devEcoStudioDir,
  devEcoStudioVersion,
  androidStudioDir,
  androidStudioVersion,
  androidSdkDir,
  androidSdkVersion,
  xCodeVersion,
  xCodeDir,
  iDeviceVersion,
  deployVersion,
  arkuiXSdkDir,
  arkuiXSdkVersion,
  javaSdkDirUser,
  javaSdkDirAndroid,
  javaSdkDirDevEco,
  javaSdkVersionUser,
  javaSdkVersionAndroid,
  javaSdkVersionDevEco,
  ohpmDir
};
