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

const process = require('child_process');

const { getTool } = require('./getTool');

function checkDevices(valid) {
  let deviceCommand;
  const toolObj = getTool() || [];
  if ('hdc' in toolObj) {
    deviceCommand = `${toolObj['hdc']} list targets`;
  } else if ('adb' in toolObj) {
    deviceCommand = `${toolObj['adb']} devices`;
  }
  try {
    const commandOutput = process.execSync(deviceCommand).toString();
    if (valid) {
      return getValidDevices(commandOutput);
    } else {
      return getDevices(commandOutput);
    }
  } catch (err) {
    // ignore
  }
}

function getValidDevices(out) {
  const DEVICE_REG = /.+device(?!s).*/g;
  return out.match(DEVICE_REG);
}

function getDevices(out) {
  const DEVICE_REG = /.+(device(?!s)|unauthorized|offline).*/g;
  return out.match(DEVICE_REG);
}

module.exports = checkDevices;
