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
const { spawn, execSync } = require('child_process');

const { getTool, getGivenTool } = require('../ace-check/getTool');
const checkDevices = require('../ace-check/checkDevices');

const toolObj = getTool();
const givenTool = getGivenTool(toolObj);

function log(device) {
  if (!validTool()) {
    return;
  }
  if (!validDevices(device)) {
    return;
  }
  if (!validManifestPath()) {
    return;
  }
  const pid = getPid(device);
  if (!validPid(pid)) {
    return;
  }

  let hilog;
  if (device) {
    if ('hdc' in toolObj) {
      hilog = spawn(toolObj['hdc'], ['-t', device, 'shell', 'hilogcat', `--pid="${pid}"`]);
    } else if ('adb' in toolObj) {
      hilog = spawn(toolObj['adb'], ['-s', device, 'shell', 'hilogcat', `--pid="${pid}"`]);
    }
  } else {
    hilog = spawn(givenTool, ['shell', 'hilogcat', `--pid="${pid}"`]);
  }
  hilog.stdout.on('data', data => {
    console.log(data.toString());
  });
  hilog.stderr.on('error', error => {
    console.error(error);
  });
  hilog.on('exit code', code => {
    console.log('exit code: ', code.toString());
  });
}

function validDevices(device) {
  const devices = checkDevices(true) || [];
  if (devices.length === 0) {
    console.error('Error: no connected device.');
    return false;
  }
  const allDevices = checkDevices() || [];
  if (!device && allDevices.length > 1) {
    console.error(`Error: more than one device/emulator, use 'ace log --device <deviceId>'.`);
    return false;
  }
  if (device && devices.indexOf(`${device}\tdevice`) === -1) {
    console.error(`Error: device ${device} not found.`);
    return false;
  }
  return true;
}

function validTool() {
  if (!toolObj) {
    console.error('Error: no such debug tool (hdc/adb) in sdk.');
    return false;
  }
  return true;
}

function validManifestPath() {
  const bundleNamePath = path.join(process.cwd(), '/source/entry/manifest.json');
  if (!fs.existsSync(bundleNamePath)) {
    console.error(`Error: run 'ace log' in the project root directory. no such file, '${bundleNamePath}'.`);
    return false;
  }
  return true;
}

function validPid(pid) {
  if (pid === undefined) {
    console.error(`Error: no such application bundle (${getBundleName()}) in the device.`);
    return false;
  }
  return true;
}

function getPid(device) {
  let hilog;
  if (device) {
    if ('hdc' in toolObj) {
      hilog = execSync(`${toolObj['hdc']} -t ${device} shell ps`);
    } else if ('adb' in toolObj) {
      hilog = execSync(`${toolObj['adb']} -s ${device} shell ps`);
    }
  } else {
    hilog = execSync(`${givenTool} shell ps`);
  }
  const bundleName = getBundleName();
  if (!bundleName) {
    return;
  }
  const PID_REG = new RegExp(`\\S+\\s+(\\d+).+${bundleName}`, 'g');
  if (PID_REG.test(hilog)) {
    return RegExp.$1;
  }
}

function getBundleName() {
  let bundleNamePath;
  try {
    bundleNamePath = path.join(process.cwd(), '/source/entry/manifest.json');
    return JSON.parse(fs.readFileSync(bundleNamePath)).appID;
  } catch (err) {
    // ignore
  }
}

module.exports = log;
