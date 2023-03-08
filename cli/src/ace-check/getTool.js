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
const { Platform, platform } = require('./platform');
const { openHarmonySdkDir, harmonyOsSdkDir, androidSdkDir, deployVersion } = require('../ace-check/configs');
function getTools() {
  let toolPaths = [];
  let hdcPath = {};
  if (androidSdkDir) {
    toolPaths.push({ 'adb': path.join(androidSdkDir, 'platform-tools', 'adb') });
  }
  if (openHarmonySdkDir) {
    hdcPath = getToolchains(OpenHarmony);
    if (hdcPath) {
      toolPaths.push(hdcPath);
    }
  }
  if (harmonyOsSdkDir) {
    hdcPath = getToolchains(HarmonyOS, 'hohdc');
    if (hdcPath) {
      toolPaths.push(hdcPath);
    }
  }
  if ((platform === Platform.MacOS) && deployVersion) {
    toolPaths.push({ 'ios-deploy': 'ios-deploy' });
  }
  return toolPaths;
}

function getToolByType(fileType, currentSystem, isLogTool) {
  let toolPath = {};
  if (fileType == 'hap') {
    if (harmonyOsSdkDir && currentSystem === HarmonyOS) {
      toolPath = getToolchains(HarmonyOS);
    } else if (openHarmonySdkDir && currentSystem === OpenHarmony) {
      toolPath = getToolchains(OpenHarmony);
    }
  }
  if (fileType == 'apk' && androidSdkDir) {
    toolPath = { 'adb': path.join(androidSdkDir, 'platform-tools', 'adb') };
  }
  if (fileType == 'app' && (platform === Platform.MacOS)) {
    if (!isLogTool) {
      toolPath = { 'ios-deploy': 'ios-deploy' };
    } else {
      toolPath = { 'idevicesyslog': 'idevicesyslog' };
    }
  }
  return toolPath;
}

function getToolchains(systemType, key) {
  let hdcPath = {};
  let toolchainsPath;
  if (!key) {
    key = 'hdc'
  }
  if (systemType === OpenHarmony) {
    toolchainsPath = path.join(openHarmonySdkDir, 'toolchains');
    if (!fs.existsSync(toolchainsPath)) {
      const fileArr = fs.readdirSync(openHarmonySdkDir);
      if (fileArr && fileArr.length > 0) {
        fileArr.forEach(item => {
          if (!isNaN(item.substring(0, 1))) {
            hdcPath[`${key}`] = path.join(openHarmonySdkDir, item, '/toolchains/hdc');
          }
        })
      }
    } else {
      hdcPath[`${key}`] = path.join(toolchainsPath, 'hdc');
    }
  } else if (systemType === HarmonyOS) {
    toolchainsPath = path.join(harmonyOsSdkDir, 'toolchains');
    if (!fs.existsSync(toolchainsPath)) {
      toolchainsPath = path.join(harmonyOsSdkDir, '/hmscore');
      const fileArr = fs.readdirSync(toolchainsPath);
      if (fileArr && fileArr.length > 0) {
        fileArr.forEach(item => {
          if (!isNaN(item.substring(0, 1))) {
            hdcPath[`${key}`] = path.join(toolchainsPath, item, '/toolchains/hdc');
          }
        })
      }
    } else {
      hdcPath[`${key}`] = path.join(toolchainsPath, 'hdc');
    }
  }
  return hdcPath;
}
module.exports = {
  getTools,
  getToolByType
};
