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
const { openHarmonySdkDir, harmonyOsSdkDir, androidSdkDir, deployVersion, ohpmDir, xCodeDir } = require('./configs');
function getTools() {
  const toolPaths = [];
  let hdcPath = {};
  if (androidSdkDir) {
    toolPaths.push({ 'adb': path.join(androidSdkDir, 'platform-tools', 'adb') });
  }
  if (openHarmonySdkDir) {
    hdcPath = getToolchains('OpenHarmony');
    if (hdcPath) {
      toolPaths.push(hdcPath);
    }
  }
  if (harmonyOsSdkDir) {
    hdcPath = getToolchains('HarmonyOS', 'hohdc');
    if (hdcPath) {
      toolPaths.push(hdcPath);
    }
  }
  if (platform === Platform.MacOS && deployVersion) {
    toolPaths.push({ 'ios-deploy': 'ios-deploy' });
  }
  if (platform === Platform.MacOS && xCodeDir) {
    toolPaths.push({'xcrun simctl': 'xcrun simctl'});
  }
  return toolPaths;
}

function getToolByType(fileType, currentSystem, isLogTool) {
  let toolPath = {};
  if (fileType === 'hap') {
    if (harmonyOsSdkDir && currentSystem === 'HarmonyOS') {
      toolPath = getToolchains('HarmonyOS');
    } else if (openHarmonySdkDir && currentSystem === 'OpenHarmony') {
      toolPath = getToolchains('OpenHarmony');
    }
  }
  if (fileType === 'apk' && androidSdkDir) {
    toolPath = { 'adb': path.join(androidSdkDir, 'platform-tools', 'adb') };
  }
  if (fileType === 'ios' && platform === Platform.MacOS) {
    if (!isLogTool) {
      toolPath = { 'ios-deploy': 'ios-deploy' };
    } else {
      toolPath = { 'idevicesyslog': 'idevicesyslog' };
    }
  }
  return toolPath;
}

function getToolchains(systemType, key) {
  const hdcPath = {};
  let toolchainsPath;
  if (!key) {
    key = 'hdc';
  }
  if (systemType === 'OpenHarmony') {
    toolchainsPath = path.join(openHarmonySdkDir, 'toolchains');
    if (!fs.existsSync(toolchainsPath)) {
      const ideHdcPath = getIdeToolPath(openHarmonySdkDir);
      if (ideHdcPath) {
        hdcPath[`${key}`] = ideHdcPath;
      }
    } else {
      const cliHdcPath = getCliToolPath(toolchainsPath);
      if (cliHdcPath) {
        hdcPath[`${key}`] = cliHdcPath;
      }
    }
  } else if (systemType === 'HarmonyOS') {
    toolchainsPath = path.join(harmonyOsSdkDir, 'toolchains');
    if (!fs.existsSync(toolchainsPath)) {
      const ideToolPath = path.join(harmonyOsSdkDir, '/openharmony');
      const ideHdcPath = getIdeToolPath(ideToolPath);
      if (ideHdcPath) {
        hdcPath[`${key}`] = ideHdcPath;
      }
    } else {
      const cliHdcPath = getCliToolPath(toolchainsPath);
      if (cliHdcPath) {
        hdcPath[`${key}`] = cliHdcPath;
      }
    }
  }
  return hdcPath;
}

function getIdeToolPath(ideToolPath) {
  let toolPath = '';
  const versionList = ['10'];
  if (fs.existsSync(ideToolPath)) {
    const fileArr = fs.readdirSync(ideToolPath);
    if (fileArr && fileArr.length > 0) {
      fileArr.forEach(item => {
        if (!isNaN(item) && parseInt(item) >= 10) {
          versionList.push(item);
        }
      });
      const sortList = versionList.sort(function (a, b) {
        return a - b;
      });
      sortList.forEach(item => {
        const tempPath = getVaildToolPath(path.join(ideToolPath, item, '/toolchains'));
        if (tempPath) {
          toolPath = tempPath;
        }
      });
    }
  }
  return toolPath;
}

function getCliToolPath(cliToolPath) {
  let toolPath = '';
  if (fs.existsSync(cliToolPath)) {
    const fileArr = fs.readdirSync(cliToolPath);
    if (fileArr && fileArr.length > 0) {
      fileArr.forEach(item => {
        if (!isNaN(item.substring(0, 1))) {
          toolPath = getVaildToolPath(path.join(cliToolPath, item));
        }
      });
    }
  }
  return toolPath;
}

function getVaildToolPath(vaildToolPath) {
  if (fs.existsSync(vaildToolPath)) {
    const fileArr = fs.readdirSync(vaildToolPath);
    for (let i = 0; i < fileArr.length; i++) {
      if (fileArr[i].substring(0, 3) === 'hdc') {
        return path.join(vaildToolPath, fileArr[i]);
      }
    }
  }
  return '';
}

function getOhpmTools() {
  if (!ohpmDir) {
    return '';
  }
  return path.join(ohpmDir, 'bin', 'ohpm');
}

// get android decompilation tool aapt
function getAapt() {
  const androidSdkBuildToolsPath = path.join(androidSdkDir, 'build-tools');
  if (fs.existsSync(androidSdkBuildToolsPath)) {
    const androidSdkBuildTools = fs.readdirSync(androidSdkBuildToolsPath);
    for (let i = 0; i < androidSdkBuildTools.length; i++) {
      const aaptDir = path.join(androidSdkBuildToolsPath, androidSdkBuildTools[i], 'aapt');
      if (platform === Platform.Windows && fs.existsSync(aaptDir + '.exe')) {
        return aaptDir;
      }
      if (platform !== Platform.Windows && fs.existsSync(aaptDir)) {
        return aaptDir;
      }
    }
    return '';
  }
}

module.exports = {
  getTools,
  getToolByType,
  getOhpmTools,
  getAapt
};
