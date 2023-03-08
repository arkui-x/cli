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
const { getTools } = require('./getTool');
function checkDevices() {
  let deviceCommand;
  let devicesOutputs = [];
  let title = "";
  const toolObj = getTools() || [];
  for (let i = 0; i < toolObj.length; i++) {
    if ('hdc' in toolObj[i]) {
      title = "Openharmony/Harmonyos Devices\t";
      deviceCommand = `${toolObj[i]['hdc']} list targets`;
    } else if ('hohdc' in toolObj[i]) {
      title = "Openharmony/Harmonyos Devices\t";
      deviceCommand = `${toolObj[i]['hohdc']} list targets`;
    } else if ('adb' in toolObj[i]) {
      title = "Android Devices\t";
      deviceCommand = `${toolObj[i]['adb']} devices`;
    } else if ('ios-deploy' in toolObj[i]) {
      title = "iOS Devices\t";
      deviceCommand = `${toolObj[i]['ios-deploy']} -c -t 1`;
    }

    try {
      const commandOutput = process.execSync(deviceCommand).toString();
      let devices = getDevices(commandOutput);
      devices.forEach(item => {
        if (!devicesOutputs.includes(title + item)) {
          devicesOutputs.push(title + item);
        }
      });
    } catch (err) {
      // ignore
    }
  }
  return devicesOutputs;
}

function getDevices(out) {
  let splitArr = out.split(/[\r\n]+/);
  splitArr = splitArr.filter(item => {
    return item != "List of devices attached" && item != "List of targets attached:" && item != "" && item != "[Empty]"
      && item.indexOf("device to be connected") == -1 && item.indexOf("Not support std mode") == -1;
  });
  return splitArr;
}

module.exports = checkDevices;
