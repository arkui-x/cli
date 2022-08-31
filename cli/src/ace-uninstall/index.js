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

// const fs = require('fs');
// const path = require('path');
const exec = require('child_process').execSync;
// const lodash = require('lodash');

const { getToolByType } = require('../ace-check/getTool');
const { validDevices } = require('../util');
function uninstall(fileType, device, bundle) {
  const toolObj = getToolByType(fileType);
  if (toolObj == null || toolObj == undefined) {
    console.error('There are not install tool, please check');
    return false;
  }
  if (toolObj && validDevices(device)) {
    let cmdPath;
    let cmdUninstallOption;
    let deviceOption;
    let commands = [];
    let cmdStopOption = '';
    if ('hdc' in toolObj) {
      cmdPath = toolObj['hdc'];
      cmdUninstallOption = 'app uninstall';
      cmdStopOption = 'shell aa force-stop';
      if (device) {
        deviceOption = `-t ${device}`;
      } else {
        deviceOption = '';
      }
    } else if ('adb' in toolObj) {
      cmdPath = toolObj['adb'];
      cmdUninstallOption = 'uninstall';
      cmdStopOption = 'shell am force-stop';
      if (device) {
        deviceOption = `-s ${device}`;
      } else {
        deviceOption = '';
      }
    } else if ('ios-deploy' in toolObj) {
      cmdPath = toolObj['ios-deploy'];
      cmdUninstallOption =  '--uninstall_only --bundle_id';
      if (device) {
        deviceOption = `--id ${device}`;
      } else {
        deviceOption = '';
      }
    } else {
      console.error('Internal error with hdc and adb checking');
      return false;
    }
    const cmdUninstall = `${cmdPath} ${deviceOption} ${cmdUninstallOption} ${bundle}`;
    if(fileType == "app") {
      commands.push(`${cmdUninstall}`);
    } else {
      //TODO 结束进程指令有必要？ ohos和android指令一致 现在ohos用了aa 需要测试？
      const cmdStop = `${cmdPath} ${deviceOption} ${cmdStopOption} ${bundle}`;
      commands.push(`${cmdStop} && ${cmdUninstall}`);
    }
    try {
      exec(`${commands}`);
      console.log(`Uninstall ${fileType.toUpperCase()} successfully.`);
      return true;
    } catch (error) {
      console.error(`Uninstall ${fileType.toUpperCase()} failed.` + error);
      return false;
    }
  }
}

module.exports = uninstall;
