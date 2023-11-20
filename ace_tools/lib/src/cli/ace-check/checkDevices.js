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
  let checkHuaweiDeviceCmd;
  const devicesOutputs = [];
  let title = '';
  const toolObj = getTools() || [];
  for (let i = 0; i < toolObj.length; i++) {
    let isCheck = false;
    if ('hdc' in toolObj[i]) {
      title = 'OpenHarmony/HarmonyOS Devices\t';
      deviceCommand = `${toolObj[i]['hdc']} list targets -v`;
    } else if ('hohdc' in toolObj[i]) {
      isCheck = true;
      checkHuaweiDeviceCmd = `${toolObj[i]['hohdc']}`;
      title = 'OpenHarmony/HarmonyOS Devices\t';
      deviceCommand = `${toolObj[i]['hohdc']} list targets -v`;
    } else if ('adb' in toolObj[i]) {
      title = 'Android Devices\t';
      deviceCommand = `${toolObj[i]['adb']} devices -l`;
    } else if ('xcrun xcdevice' in toolObj[i]) {
      title = 'iOS Devices\t';
      deviceCommand = `${toolObj[i]['xcrun xcdevice']} list --timeout 3`;
      const commandOutput = process.execSync(deviceCommand, { stdio: 'pipe' }).toString().trim();
      const jsonlist = getIosDevices(commandOutput);
      devicesOutputs.push(...jsonlist);
      continue;
    } else if ('xcrun simctl' in toolObj[i]) {
      title = 'iOS Simulator\t';
      deviceCommand = `${toolObj[i]['xcrun simctl']} list devices booted iOS --json`;
      const commandOutput = process.execSync(deviceCommand).toString().trim();
      const json = JSON.parse(commandOutput);
      const devices = json['devices'];
      Object.keys(devices).forEach(key => {
        devices[key].forEach(item => {
          let devicesjson = {
            'name': item['name'],
            'udid': item['udid'],
            'title': title,
            'Simulator': true
          }
          devicesOutputs.push(JSON.stringify(devicesjson));
        });
      });
      continue;
    }
    else {
      continue;
    }

    try {
      const commandOutput = process.execSync(deviceCommand).toString().trim();
      const devices = getDevices(commandOutput);
      devices.forEach(item => {
        if (isCheck) {
          const id = item.split(/[\t\s]+/)[0];
          checkHuaweiDeviceCmd += ` -t ${id} shell getprop ro.product.brand`;
          if (process.execSync(checkHuaweiDeviceCmd, { stdio: 'pipe' }).toString().trim().toLowerCase() !== 'huawei') {
            return;
          }
        }
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

function getIosDevices(out) {
  const devices = [];
  const devicelist = JSON.parse(out);
  devicelist.forEach(item => {
    if (item['simulator'] === true || item['available'] !== true || item['platform'] === 'com.apple.platform.macosx') {
      return;
    }
    let devicesjson = {
      'name': item['name'],
      'udid': item['identifier'],
      'title': 'iOS Devices\t',
      'Simulator': false,
      'iosVersion': item['operatingSystemVersion']
    }
    devices.push(JSON.stringify(devicesjson));
  });
  return devices;
}

function getDevices(out) {
  let splitArr = out.split(/[\r\n]+/);
  splitArr = splitArr.filter(item => {
    return item !== 'List of devices attached' && item !== 'List of targets attached:' && item !== ''
      && item.indexOf('[Empty]') === -1 && item.indexOf('device to be connected') === -1 && item.indexOf('hdc') !== 1
      && item.indexOf('Not support std mode') === -1 && item.indexOf('COM1') === -1 && item.indexOf('UART') === -1;
  });
  return splitArr;
}

module.exports = {
  checkDevices
};
