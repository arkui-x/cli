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

const { homeDir } = require('./platform');
const Sdk = require('./Sdk');
const Ide = require('./Ide');
const checkNodejs = require('./checkNodejs');
const { checkXcodeVersion, checkIdeviceVersion, checkDeployVersion} = require('./checkAppVersion');

const openHarmonySdk = new Sdk(
  'OpenHarmony',
  ['OpenHarmony'],
  'OpenHarmony_HOME',
  'OpenHarmony',
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
const nodejsDir = checkNodejs();
const devEcoStudioDir = devEcoStudio.locateIde();
const androidStudioDir = androidStudio.locateIde();
const androidSdkDir = androidSdk.locateSdk();
const xCodeVersion = checkXcodeVersion();
const iDeviceVersion = checkIdeviceVersion();
const deployVersion = checkDeployVersion();

module.exports = {
  openHarmonySdkDir,
  nodejsDir,
  devEcoStudioDir,
  androidStudioDir,
  androidSdkDir,
  xCodeVersion,
  iDeviceVersion,
  deployVersion
};
