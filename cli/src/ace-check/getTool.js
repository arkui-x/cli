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

const fs = require('fs');
const path = require('path');
const { Platform, platform } = require('./platform');
const { openHarmonySdkDir, androidSdkDir, deployVersion } = require('../ace-check/configs');
function getTools() {
  let toolPaths = [];
  if (androidSdkDir) {
    toolPaths.push({ 'adb': path.join(androidSdkDir, 'platform-tools', 'adb') });
  }
  if (openHarmonySdkDir) {
    try {
      const toolchainsPath = path.join(openHarmonySdkDir, "toolchains");
      const fileArr = fs.readdirSync(toolchainsPath);
      let hdcPath;
      if (fileArr.length > 0) {
        fileArr.forEach(item => {
          if (item.substring(0, 1) != ".") {
            hdcPath = ({ 'hdc': path.join(toolchainsPath, item, 'hdc_std') });
          }
        })
        if (hdcPath) {
          toolPaths.push(hdcPath);
        }
      }
    } catch (err) {
      // ignore
    }
  }
  if ((platform === Platform.MacOS) && deployVersion) {
    toolPaths.push({ 'ios-deploy': 'ios-deploy' });
  }
  return toolPaths;
}
function getToolByType(fileType, isLogTool) {
  let toolPath;
  if (fileType == 'hap' && openHarmonySdkDir) {
    try {
      const toolchainsPath = path.join(openHarmonySdkDir, "toolchains");
      const fileaArr = fs.readdirSync(toolchainsPath);
      if (fileaArr.length > 0) {
        fileaArr.forEach(item => {
          if (item.substring(0, 1) != ".") {
            toolPath = ({ 'hdc': path.join(toolchainsPath, item, 'hdc_std') });
          }
        })
      }
    } catch (err) {
      // ignore
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

module.exports = {
  getTools,
  getToolByType
};
