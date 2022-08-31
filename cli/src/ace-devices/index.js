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

const checkDevices = require('../ace-check/checkDevices');
const { getTools } = require('../ace-check/getTool');
const { Platform, platform } = require('../ace-check/platform');
function devices() {
  if (getTools().length == 0) {
    console.info(`No such debug tools (hdc/adb/ios-deploy).`);
    return {
      'all': [],
      'available': [],
      'unavailable': []
    };
  }
  let hdcTitle = "[×] hdc is not installed";
  let adbTitle = "[×] adb is not installed";
  let iosDeployTitle = "[×] adb is not installed";
  for (let i = 0; i < getTools().length; i++) {
    if (getTools()[i]["hdc"]) {
      hdcTitle = "[√] hdc installed";
    }
    if (getTools()[i]["adb"]) {
      adbTitle = "[√] adb installed";
    }
    if (getTools()[i]["ios-deploy"]) {
      iosDeployTitle = "[√] ios-deploy installed";
    }  
  }
  if(platform != Platform.MacOS) {
    iosdeployTitle = "";
  }
  let toolMsg = hdcTitle + " " + adbTitle + " " + iosDeployTitle;
  console.log(`Tools info :\t` + toolMsg);
  const devices = checkDevices() || [];
  let availableDevices = [];
  let unavailableDevices = [];
  if (devices.length === 0) {
    console.log(`[!] No connected device`);
  } else {
    for (let i = 0; i < devices.length; i++) {
      let device = devices[i];
      if (device.indexOf('unauthorized') !== -1 ||
        device.indexOf('offline') !== -1) {
        unavailableDevices.push(device);
      } else {
        availableDevices.push(device);
      }
    }
    if (availableDevices.length > 0) {
      console.log(`[√] Connected device (${availableDevices.length} available)\r\n  • ${availableDevices.join('\r\n  • ')}`);
    }
    if (unavailableDevices.length > 0) {
      console.log(`[!] Connected device (${unavailableDevices.length} unavailable)'\r\n  ! ${unavailableDevices.join('\r\n  ! ')}`);
    }
  }
  return {
    'all': devices,
    'available': availableDevices,
    'unavailable': unavailableDevices
  };
}

module.exports = devices;
