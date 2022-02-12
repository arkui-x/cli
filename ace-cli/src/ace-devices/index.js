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
const { getTool } = require('../ace-check/getTool');

function devices() {
  if (!getTool()) {
    console.info(`No such debug tool (hdc/adb) in sdk.`);
    return;
  }
  const device = checkDevices() || [];
  let availableDevices = [];
  let unavailableDevices = [];
  if (device.length === 0) {
    console.log(`[!] No connected device`);
  } else {
    availableDevices = device.filter(item => item.indexOf('device') !== -1);
    unavailableDevices = device.filter(item => item.indexOf('unauthorized') !== -1 ||
      item.indexOf('offline') !== -1);
    if (availableDevices.length > 0) {
      console.log(`[√] Connected device (${availableDevices.length} available)
  • ${availableDevices.join('\r\n  • ')}`
      );
    }
    if (unavailableDevices.length > 0) {
      console.log(`[!] Connected device (${unavailableDevices.length} unavailable)
  ! ${unavailableDevices.join('\r\n  ! ')}`);
    }
  }
  return {
    'all': device,
    'available': availableDevices,
    'unavailable': unavailableDevices
  };
}

module.exports = devices;
