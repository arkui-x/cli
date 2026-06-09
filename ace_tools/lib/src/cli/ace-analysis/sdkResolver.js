/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
const { Platform, platform } = require('../ace-check/platform');
const { getDevVersion } = require('../ace-build');
const { openHarmonySdkDir, devEcoStudioDir } = require('../ace-check/configs');
const {
  setGlobalSdkPath,
  getGlobalSdkPath,
  SDK_PKG_FILES,
} = require('./constants');
const { logError } = require('./utils');

function readBuildProfile() {
  const filePath = './build-profile.json5';
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON5.parse(fs.readFileSync(filePath, 'utf8'));
}

function getSdkPathFromConfig() {
  const jsonObj = readBuildProfile();
  if (!jsonObj || !jsonObj.app || !jsonObj.app.products || jsonObj.app.products.length === 0) {
    return '';
  }

  const product = jsonObj.app.products[0];
  if (!product || product.runtimeOS !== 'HarmonyOS') {
    return '';
  }

  const devVersion = getDevVersion();
  if (devVersion < 12) {
    return '';
  }

  if (platform === Platform.Windows) {
    return `${devEcoStudioDir}\\sdk`;
  }
  return `${devEcoStudioDir}/Contents/sdk`;
}

function checkSdkPathExists(sdkPath) {
  if (!sdkPath) {
    return false;
  }
  for (const pkgFile of SDK_PKG_FILES) {
    if (fs.existsSync(path.join(sdkPath, pkgFile))) {
      return true;
    }
  }
  return false;
}

function validateAndSetSdkPath(sdkPath) {
  if (sdkPath) {
    if (!checkSdkPathExists(sdkPath)) {
      logError('Error: please input the correct HarmonyOS sdk path');
      return false;
    }
    setGlobalSdkPath(sdkPath);
    return true;
  }

  const localSdkPath = getSdkPathFromConfig();
  if (!checkSdkPathExists(localSdkPath)) {
    logError('Error: get sdk path fail, please check ace config or input the HarmonyOS sdk path');
    return false;
  }
  setGlobalSdkPath(localSdkPath);
  return true;
}

module.exports = {
  readBuildProfile,
  getSdkPathFromConfig,
  checkSdkPathExists,
  validateAndSetSdkPath,
};
