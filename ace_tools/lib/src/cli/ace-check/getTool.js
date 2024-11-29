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
const { cmpVersion } = require('./util');
const { Platform, platform } = require('./platform');
const { openHarmonySdkDir, harmonyOsSdkDir, androidSdkDir, deployVersion, ohpmDir, xCodeDir, xCodeVersion, devEcoStudioDir } = require('./configs');
function getTools() {
  const toolPaths = [];
  let hdcPath = {};
  if (androidSdkDir) {
    toolPaths.push({ 'adb': `"${path.join(androidSdkDir, 'platform-tools', 'adb')}"` });
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
  if (platform === Platform.MacOS && xCodeDir) {
    toolPaths.push({'xcrun simctl': 'xcrun simctl'});
    toolPaths.push({'xcrun xcdevice': 'xcrun xcdevice'});
    if (Number(xCodeVersion[0].split(' ')[1].split('.')[0]) >= 15) {
      toolPaths.push({'xcrun devicectl': 'xcrun devicectl'});
    }
    if (deployVersion) {
      toolPaths.push({ 'ios-deploy': 'ios-deploy' });
    } 
    
  }
  return toolPaths;
}

function getToolByType(fileType, currentSystem, isLogTool) {
  let toolPath = {};
  if (fileType === 'hap' || fileType === 'hsp' || fileType === 'haphsp') {
    if (harmonyOsSdkDir && currentSystem === 'HarmonyOS') {
      toolPath = getToolchains('HarmonyOS');
    } else if (openHarmonySdkDir && currentSystem === 'OpenHarmony') {
      toolPath = getToolchains('OpenHarmony');
    }
    if (isLogTool) {
      toolPath['hdc'] = toolPath['hdc'].replace(/^"|"$/g, '');
    }
  }
  if (fileType === 'apk' && androidSdkDir) {
    if (isLogTool) {
      toolPath = { 'adb': `${path.join(androidSdkDir, 'platform-tools', 'adb')}` };
    } else {
      toolPath = { 'adb': `"${path.join(androidSdkDir, 'platform-tools', 'adb')}"` };
    }
  }
  if (fileType === 'ios' && platform === Platform.MacOS) {
    if (!isLogTool) {
      if (Number(xCodeVersion[0].split(' ')[1].split('.')[0]) >= 15) {
        toolPath = { 'xcrun simctl': 'xcrun simctl', 'xcrun devicectl': 'xcrun devicectl', 'ios-deploy': 'ios-deploy'};
      } else {
        toolPath = { 'xcrun simctl': 'xcrun simctl', 'ios-deploy': 'ios-deploy'};
      }
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
        hdcPath[`${key}`] = `"${ideHdcPath}"`;
      }
    } else {
      const cliHdcPath = getCliToolPath(toolchainsPath);
      if (cliHdcPath) {
        hdcPath[`${key}`] = `"${cliHdcPath}"`;
      }
    }
  } else if (systemType === 'HarmonyOS') {
    const hmsToolPath = getHmsToolPath(harmonyOsSdkDir);
    if (hmsToolPath) {
      hdcPath[`${key}`] = `"${hmsToolPath}"`;
    } else {
      toolchainsPath = path.join(harmonyOsSdkDir, 'toolchains');
      if (!fs.existsSync(toolchainsPath)) {
        const ideToolPath = path.join(harmonyOsSdkDir, '/openharmony');
        const ideHdcPath = getIdeToolPath(ideToolPath);
        if (ideHdcPath) {
          hdcPath[`${key}`] = `"${ideHdcPath}"`;
        }
      } else {
        const cliHdcPath = getCliToolPath(toolchainsPath);
        if (cliHdcPath) {
          hdcPath[`${key}`] = `"${cliHdcPath}"`;
        }
      }
    }
  }
  return hdcPath;
}

function getHmsToolPath(newPath) {
  let toolPath;
  const sdkPlatformVersion = new Map();
  fs.readdirSync(newPath).forEach(dir => {
    if (dir.includes('HarmonyOS') || (dir.includes('default'))) {
      const platformVersion = JSON5.parse(fs.readFileSync(
        path.join(newPath, dir, 'sdk-pkg.json'))).data.platformVersion;
      sdkPlatformVersion.set(platformVersion, dir);
    }
  });
  let toolchainsPath = 'openharmony/toolchains';
  if (sdkPlatformVersion.size === 0) {
    toolPath = '';
  } else if (sdkPlatformVersion.size === 1) {
    if ([...sdkPlatformVersion.keys()][0] === "4.0.0(10)" || [...sdkPlatformVersion.keys()][0] === "4.1.0(11)") {
        toolchainsPath = 'base/toolchains';
    }
    toolPath = getValidToolPath(path.join(newPath, [...sdkPlatformVersion.values()][0], toolchainsPath));
  } else {
    const compareVer = [...sdkPlatformVersion.keys()];
    for (let i = 0; i < compareVer.length - 1; i++) {
      if (cmpVersion(compareVer[i], compareVer[i + 1])) {
        let tmp = compareVer[i];
        compareVer[i] = compareVer[i + 1];
        compareVer[i + 1] = tmp;
      }
    }
    const maxVersion = compareVer[compareVer.length - 1];
    if (maxVersion === "4.0.0(10)" || maxVersion === "4.1.0(11)") {
      toolchainsPath = 'base/toolchains';
    }
    toolPath = getValidToolPath(path.join(newPath, sdkPlatformVersion.get(maxVersion), toolchainsPath));
  }
  return toolPath;
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
        const tempPath = getValidToolPath(path.join(ideToolPath, item, '/toolchains'));
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
          toolPath = getValidToolPath(path.join(cliToolPath, item));
        }
      });
    }
  }
  return toolPath;
}

function getValidToolPath(validToolPath) {
  if (fs.existsSync(validToolPath)) {
    const fileArr = fs.readdirSync(validToolPath);
    for (let i = 0; i < fileArr.length; i++) {
      if (fileArr[i].substring(0, 3) === 'hdc') {
        return path.join(validToolPath, fileArr[i]);
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

function getIntergrateHvigorw() {
  if (!devEcoStudioDir) {
    return null;
  } else {
    if (platform === Platform.Windows) {
      if (fs.existsSync(path.join(devEcoStudioDir, 'tools/hvigor/bin/hvigorw'))) {
        return path.join(devEcoStudioDir, 'tools/hvigor/bin/hvigorw');
      } else {
        return null;
      }
    } else if (platform === Platform.MacOS) {
      if (fs.existsSync(path.join(devEcoStudioDir, 'Contents/tools/hvigor/bin/hvigorw'))) {
        return path.join(devEcoStudioDir, 'Contents/tools/hvigor/bin/hvigorw');
      } else {
        return null;
      }
    }
  }
}

module.exports = {
  getTools,
  getToolByType,
  getOhpmTools,
  getAapt,
  getIntergrateHvigorw
};
