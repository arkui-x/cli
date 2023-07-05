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
const { setConfig } = require('../ace-config');
const devices = require('../ace-devices');
const info = require('./Info');
const process = require('child_process');
const {
  requirementTitle,
  optionTitle,
  requirementInfo,
  optionInfo
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
  return errorTimes;
}
function check() {
  let errorTimes = 0;
  errorTimes = checkRequired(errorTimes);

  if (ohpmDir) {
    setConfig({ 'ohpm-dir': ohpmDir });
  }

  if (arkuiXSdkDir) {
    setConfig({ 'arkui-x-sdk': arkuiXSdkDir });
  }

  if (openHarmonySdkDir) {
    setConfig({ 'openharmony-sdk': openHarmonySdkDir });
  }

  if (harmonyOsSdkDir) {
    setConfig({ 'harmonyos-sdk': harmonyOsSdkDir });
  }

  if (nodejsDir) {
    setConfig({ 'nodejs-dir': nodejsDir });
    process.execSync(`npm config set @ohos:registry=https://repo.harmonyos.com/npm/`);
  }

  if (javaSdkDir) {
    setConfig({ 'java-sdk': javaSdkDir });
  }

  if (androidSdkDir) {
    setConfig({ 'android-sdk': androidSdkDir });
  }

  errorTimes = !arkuiXSdkDir ? errorTimes++ : errorTimes;
  errorTimes = !openHarmonySdkDir ? errorTimes++ : errorTimes;
  errorTimes = !harmonyOsSdkDir ? errorTimes++ : errorTimes;
  errorTimes = !nodejsDir ? errorTimes++ : errorTimes;
  errorTimes = !javaSdkDir ? errorTimes++ : errorTimes;
  errorTimes = !androidSdkDir ? errorTimes++ : errorTimes;
  errorTimes = !devEcoStudioDir ? errorTimes++ : errorTimes;
  errorTimes = !androidStudioDir ? errorTimes++ : errorTimes;

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
  ! Ace-check found issues in 1 category.`);
  } else if (errorTimes > 1) {
    console.log(`
  ! Ace-check found issues in ${errorTimes} categories.`);
  } else {
    console.log(`
  √ Ace-check found no issues.`);
  }
}

module.exports = check;
