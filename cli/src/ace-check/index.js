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
  openHarmonySdkDir,
  harmonyOsSdkDir,
  nodejsDir,
  devEcoStudioDir,
  androidStudioDir,
  androidSdkDir,
  xCodeVersion,
  iDeviceVersion,
  deployVersion,
  arkuiXSdkDir,
  ohpmDir
} = require('./configs');
const checkJavaSdk = require('./checkJavaSdk');
const { autoSetArkUISdk, ArkUIXSdkPathCheck } = require('../ace-config');
const devices = require('../ace-devices');
const info = require('./Info');
const process = require('child_process');
const {
  requirementTitle,
  optionTitle,
  requirementInfo,
  optionInfo,
  showWarningInfo
} = require('./util');

const javaSdkDir = checkJavaSdk();
const { Platform, platform } = require('./platform');

function checkRequired(errorTimes) {
  requirementTitle(info.arkuiXSdkTitle, arkuiXSdkDir && nodejsDir && javaSdkDir);
  requirementInfo(info.arkuiXSdkInfo(arkuiXSdkDir), arkuiXSdkDir);
  requirementInfo(info.nodejsInfo(nodejsDir), nodejsDir);
  requirementInfo(info.javaSdkInfo(javaSdkDir), javaSdkDir);
  requirementInfo(info.ohpmToolInfo(ohpmDir), ohpmDir);

  requirementTitle(info.openHarmonyTitle, openHarmonySdkDir && nodejsDir && javaSdkDir);
  requirementInfo(info.openHarmonySdkInfo(openHarmonySdkDir), openHarmonySdkDir);
  requirementInfo(info.nodejsInfo(nodejsDir), nodejsDir);
  requirementInfo(info.javaSdkInfo(javaSdkDir), javaSdkDir);
  requirementInfo(info.ohpmToolInfo(ohpmDir), ohpmDir);

  requirementTitle(info.harmonyOsTitle, harmonyOsSdkDir && nodejsDir && javaSdkDir);
  requirementInfo(info.harmonyOsSdkInfo(harmonyOsSdkDir), harmonyOsSdkDir);
  requirementInfo(info.nodejsInfo(nodejsDir), nodejsDir);
  requirementInfo(info.javaSdkInfo(javaSdkDir), javaSdkDir);
  requirementInfo(info.ohpmToolInfo(ohpmDir), ohpmDir);

  optionTitle(info.androidTitle, androidSdkDir);
  optionInfo(info.androidSdkInfo(androidSdkDir), androidSdkDir);
  if (platform !== Platform.Linux) {
    optionTitle(info.devEcoStudioTitle, devEcoStudioDir);
    optionInfo(info.devEcoStudioInfo(devEcoStudioDir), devEcoStudioDir);
  }
  optionTitle(info.androidStudioTitle, androidStudioDir);
  optionInfo(info.androidStudioInfo(androidStudioDir), androidStudioDir);

  if (platform === Platform.MacOS) {
    requirementTitle(info.iosXcodeTitle, xCodeVersion && iDeviceVersion && deployVersion);
    requirementInfo(info.iosXcodeVersionInfo(xCodeVersion), xCodeVersion);
    requirementInfo(info.iosIdeviceVersionInfo(iDeviceVersion), iDeviceVersion);
    requirementInfo(info.iosDeployVersionInfo(deployVersion), deployVersion);
    errorTimes = (!xCodeVersion || !iDeviceVersion || !deployVersion) ? errorTimes++ : errorTimes;
  }
  showWarning();
  return errorTimes;
}

function showWarning() {
  const needSdks = [
    openHarmonySdkDir,
    harmonyOsSdkDir,
    nodejsDir,
    ohpmDir,
    javaSdkDir,
    arkuiXSdkDir,
    androidSdkDir,
    androidStudioDir
  ];

  const warningInfo = [
    info.warnOpenHarmonySdk,
    info.warnHarmonyOsSdk,
    info.warnNodejs,
    info.warnOhpm,
    info.warnJavaSdk,
    info.warnArkuiXSdk,
    info.warnAndroidSdk,
    info.warnAndroidStudio,
    info.warnDevEcoStudio,
    info.warnMacTools
  ];
  let msgs = [];
  if (platform !== Platform.Linux) {
    needSdks.push(devEcoStudioDir);
  }
  if (platform === Platform.MacOS) {
    needSdks.push(xCodeVersion && iDeviceVersion && deployVersion);
  }

  needSdks.forEach((sdk, index) => {
    if (!sdk) {
      msgs.push(warningInfo[index]);
    }
  });
  if(arkuiXSdkDir) {
    let checkInfo = []
    ArkUIXSdkPathCheck(arkuiXSdkDir,checkInfo);
    checkInfo.forEach((key)=>{
      msgs.push(key);
    })
  } else {
    autoSetArkUISdk();
  }
  if (msgs.length !== 0) {
    showWarningInfo(msgs);
  }
}

function check() {
  let errorTimes = 0;
  errorTimes = checkRequired(errorTimes);

  if (nodejsDir) {
    process.execSync(`npm config set @ohos:registry=https://repo.harmonyos.com/npm/`);
  }

  if(!arkuiXSdkDir) {
    errorTimes++;  
  }
  if(!openHarmonySdkDir) {
    errorTimes++;  
  }
  if(!harmonyOsSdkDir) {
    errorTimes++;  
  }
  if(!nodejsDir) {
    errorTimes++;  
  }
  if(!javaSdkDir) {
    errorTimes++;  
  }
  if(!androidSdkDir) {
    errorTimes++;  
  }
  if(!devEcoStudioDir) {
    errorTimes++;  
  }
  if(!androidStudioDir) {
    errorTimes++;  
  }

  if (openHarmonySdkDir || harmonyOsSdkDir || androidSdkDir || deployVersion) {
    const validDevice = devices(true);
    if (validDevice.all.length === 0) {
      errorTimes += 1;
    }
  } else {
    console.log(`[!] No debug tool`);
    errorTimes += 1;
  }
  printCheckInfo(errorTimes);
}

function printCheckInfo(errorTimes) {
  if (errorTimes === 1) {
    console.log(`
  ! ACE Tools found issues in 1 category.`);
  } else if (errorTimes > 1) {
    console.log(`
  ! ACE Tools found issues in ${errorTimes} categories.`);
  } else {
    console.log(`
  √ ACE Tools found no issues.`);
  }
}

module.exports = check;
