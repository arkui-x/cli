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

const path = require('path');

const { openHarmonySdk, harmonyOsSdk, arkuiXSdk, androidSdk } = require('./Sdk');
const { devEcoStudio, androidStudio} = require('./Ide');
const { checkNodejs, getNodejsVersion} = require('./checkNodejs');
const checkOhpm = require('./checkOhpm');
const { checkXcodeVersion, checkIdeviceVersion, checkDeployVersion, getxCodeDir } = require('./checkAppVersion');
const { getJavaVersion, getJavaSdkDirInEnv, getJavaSdkDirInIde } = require('./checkJavaSdk');
const { getSourceDir, getSourceArkuixVersion } = require('./checkSource');

const sourceDir = getSourceDir();
const sourceArkuiXSdkVersion = getSourceArkuixVersion();

const openHarmonySdkDir = openHarmonySdk.locateSdk();
const openHarmonySdkVersion = openHarmonySdk.getVersion(openHarmonySdkDir);

const harmonyOsSdkDir = harmonyOsSdk.locateSdk();
const harmonyOsSdkVersion = harmonyOsSdk.getVersion(harmonyOsSdkDir);

const arkuiXSdkDir = arkuiXSdk.locateSdk();
const arkuiXSdkVersion = arkuiXSdk.getVersion(arkuiXSdkDir);

const androidSdkDir = androidSdk.locateSdk();
const androidSdkVersion = androidSdk.getVersion(androidSdkDir);

const nodejsDir = checkNodejs();
const nodejsVersion = getNodejsVersion();
const ohpmDir = checkOhpm();

const devEcoStudioDir = devEcoStudio.locateIde();
const devEcoStudioVersion = devEcoStudio.getVersion(devEcoStudioDir);

const androidStudioDir = androidStudio.locateIde();
const androidStudioVersion = androidStudio.getVersion(androidStudioDir);

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
  ohpmDir,
  sourceDir,
  sourceArkuiXSdkVersion,
};
