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

const exec = require('child_process').execSync;
const { type } = require('os');
const { checkDevices } = require('../ace-check/checkDevices');
const { getTools } = require('../ace-check/getTool');
const { Platform, platform } = require('../ace-check/platform');
const devicesList = getDevicesList();

function getDevicesList() {
  const tools = getTools();
  if (tools && tools.length === 0) {
    console.info(`No such debug tools (hdc/adb/ios-deploy).`);
    return {
      'all': [],
      'available': [],
      'unavailable': []
    };
  }
  const devices = checkDevices() || [];
  const [availableDevices, unavailableDevices] = [[], []];
  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    if (device.indexOf('unauthorized') !== -1 || device.toLowerCase().indexOf('offline') !== -1) {
      unavailableDevices.push(device);
    } else {
      availableDevices.push(device);
    }
  }
  return {
    'all': devices,
    'available': availableDevices,
    'unavailable': unavailableDevices
  };
}

function devices() {
  const tools = getTools();
  if (tools && tools.length === 0) {
    console.info(`No such debug tools (hdc/adb/ios-deploy).`);
  }
  showTools(tools);
  const devices = devicesList.all;
  const [availableDevices, unavailableDevices] = [devicesList.available, devicesList.unavailable];
  if (devices.length === 0) {
    console.log(`[!] No connected device`);
  } else {
    if (availableDevices.length > 0) {
      const len = availableDevices.length;
      console.log(`[√] Connected device (${len} available)`);
      availableDevices.forEach(device => {
        showDeviceInfo(device, '  • ');
      });
    }
    if (unavailableDevices.length > 0) {
      const len = unavailableDevices.length;
      console.log(`[!] Connected device (${len} unavailable)'\r\n  ! ${unavailableDevices.join('\r\n  ! ')}`);
    }
  }
}

function showTools(tools) {
  let [ohHdcTitle, hoHdcTitle, adbTitle, iosDeployTitle] =
    ['[×] OpenHarmony hdc is not installed', '[×] HarmonyOS hdc is not installed',
      '[×] adb is not installed', '[×] ios-deploy is not installed'];
  for (let i = 0; i < tools.length; i++) {
    ohHdcTitle = tools[i]['hdc'] ? '[√] OpenHarmony hdc installed' : ohHdcTitle;
    hoHdcTitle = tools[i]['hohdc'] ? '[√] HarmonyOS hdc installed' : hoHdcTitle;
    adbTitle = tools[i]['adb'] ? '[√] adb installed' : adbTitle;
    iosDeployTitle = tools[i]['ios-deploy'] ? '[√] ios-deploy installed' : iosDeployTitle;
  }
  iosDeployTitle = platform !== Platform.MacOS ? '' : iosDeployTitle;
  const toolMsg = ohHdcTitle + '\n            ' + hoHdcTitle + '\n            ' + adbTitle + '\n            ' + iosDeployTitle;
  console.log('Tools info :' + toolMsg);
}

function showDeviceInfo(device, icon) {
  const id = getDeviceID(device);
  const title = getDeviceTitle(device);
  let type = device.split(/[\t\s]+/)[0];
  if (device.startsWith('{') && device.endsWith('}')) {
    type = JSON.parse(device)['title'].trim();
  }
  console.log('\x1B[32m%s\x1B[0m', `${icon}`, `${title} (${id}) [${type}]`);
}

function getDeviceTitle(device) {
  let title;
  if (device.startsWith('{') && device.endsWith('}')) {
    return JSON.parse(device)['name'];
  }
  else if (device.split(/[\t\s]+/)[0] === 'iOS') {
    const id = getDeviceID(device);
    title = exec(`idevicename -u ${id}`).toString().trimEnd();
  } else {
    if (device.includes(':')) {
      title = device.split(/:/g)[2].split(/[\t\s]+/)[0];
    } else {
      title = device.split(/[\t\s]+/)[5];
    }
  }
  return title;
}

function getDeviceID(device) {
  let id;
  if (device.startsWith('{') && device.endsWith('}')) {
    return JSON.parse(device)['udid'];
  }
  if (device.split(/[\t\s]+/)[0] === 'iOS') {
    id = device.split(/[\t\s]+/)[4];
  } else {
    id = device.split(/[\t\s]+/)[2];
  }
  return id;
}

function getDeviceType(id) {
  let fileType = '';
  let deviceType = '';
  const validDevices = devicesList.available;
  for (let i = 0; i < validDevices.length; ++i) {
    if (id === getDeviceID(validDevices[i])) {
      if (validDevices[i].startsWith('{') && validDevices[i].endsWith('}')) {
        deviceType = 'iOS';
        break;
      }
      deviceType = validDevices[i].split(/[\t\s]+/)[0];
      break;
    }
  }
  if (deviceType === 'iOS') {
    fileType = 'app';
  } else if (deviceType === 'Android') {
    fileType = 'apk';
  } else if (deviceType === 'OpenHarmony/HarmonyOS') {
    fileType = 'hap';
  }
  return fileType;
}

function showValidDevice(fileType) {
  let validDevices;
  const mapDevice = new Map();
  const devicesArr = devicesList;
  let flag = '';
  if (fileType) {
    if (fileType === 'app') {
      flag = 'iOS';
    } else if (fileType === 'apk') {
      flag = 'Android';
    } else {
      flag = 'OpenHarmony/HarmonyOS';
    }
    validDevices = getTypeDevice(devicesArr.available, flag);
  } else {
    validDevices = devicesArr.available;
  }

  if (validDevices.length === 0) {
    console.error('\x1B[31m%s\x1B[0m', `Error: no available ${flag} Device.`);
    return;
  } else if (validDevices.length === 1) {
    mapDevice.set('0', validDevices[0]);
  } else {
    validDevices.forEach((device, index) => {
      mapDevice.set((index + 1).toString(), device);
      showDeviceInfo(device, `[${index + 1}]: `);
    });
  }
  return mapDevice;
}

function getTypeDevice(validDevices, flag) {
  const typeDevice = [];
  validDevices.forEach(device => {
    if (device.startsWith('{') && device.endsWith('}')) {
      if (flag === 'iOS') {
        typeDevice.push(device);
      }
    }
    else if (device.split(/[\t\s]+/)[0] === flag) {
      typeDevice.push(device);
    }
  });
  return typeDevice;
}

function isSimulator(device) {
  if (device === undefined) {
    if (devicesList.available.length === 1 && devicesList.available[0].startsWith('{') && devicesList.available[0].endsWith('}')) {
      return true;
    }
    else {
      return false;
    }
  }
  for (let i = 0; i < devicesList.available.length; i++) {
    if (devicesList.available[i].startsWith('{') && devicesList.available[i].endsWith('}')) {
      if (device === JSON.parse(devicesList.available[i])['udid']) {
        return true;
      }
    }
  }
  return false;
}

module.exports = {
  devices,
  getDeviceID,
  showValidDevice,
  getDeviceType,
  devicesList,
  isSimulator
};
