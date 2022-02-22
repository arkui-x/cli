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

const path = require('path');

const { harmonyOSSdkDir, androidSdkDir } = require('../ace-check/configs');

function getTool() {
  let toolPath;
  if (harmonyOSSdkDir) {
    // toolPath = {'hdc': path.join(harmonyOSSdkDir, 'toolchains', 'hdc')};
    toolPath = {'adb': path.join(androidSdkDir, 'platform-tools', 'adb')};
  } else if (!harmonyOSSdkDir && androidSdkDir) {
    toolPath = {'adb': path.join(androidSdkDir, 'platform-tools', 'adb')};
  }
  return toolPath;
}

function getGivenTool(toolObj) {
  let tool;
  toolObj = toolObj || [];
  if ('hdc' in toolObj) {
    tool = toolObj['hdc'];
  } else if ('adb' in toolObj) {
    tool = toolObj['adb'];
  }
  return tool;
}

module.exports = {
  getTool,
  getGivenTool
};
