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

const process = require('child_process');
const { Platform, platform, homeDir} = require('./platform');
const path = require('path');
const fs = require('fs');
function checkXcodeVersion() {
  try {
    if (platform === Platform.MacOS) {
      let xcodeVersion = process.execSync(`xcodebuild  -version`, { stdio: 'pipe' }).toString().replace(/\n/g, '');
      if (xcodeVersion) {
        const buildIndex = xcodeVersion.indexOf('Build');
        xcodeVersion = [xcodeVersion.substring(0, buildIndex), xcodeVersion.substring(buildIndex)];
        return xcodeVersion;
      }
    }
    return '';
  } catch (err) {
    // ignore
  }
}
function checkIdeviceVersion() {
  try {
    if (platform === Platform.MacOS) {
      let versionInfo = process.execSync(`idevicesyslog -v`, { stdio: 'pipe' }).toString().replace(/\n/g, '');
      versionInfo = versionInfo.replace('idevicesyslog', 'libimobiledevice');
      return versionInfo;
    }
    return '';
  } catch (err) {
    // ignore
  }
}
function checkDeployVersion() {
  try {
    if (platform === Platform.MacOS) {
      const iosDeployVersion = process.execSync(`ios-deploy -V`, { stdio: 'pipe' }).toString().replace(/\n/g, '');
      return iosDeployVersion ? 'ios-deploy ' + iosDeployVersion : iosDeployVersion;
    }
    return '';
  } catch (err) {
    // ignore
  }
}

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

module.exports = {
  checkXcodeVersion,
  checkIdeviceVersion,
  checkDeployVersion,
  getxCodeDir
};
