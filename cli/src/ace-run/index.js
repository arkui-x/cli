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
const compiler = require('../ace-build/ace-compiler');
const build = require('../ace-build');
const install = require('../ace-install');
const launch = require('../ace-launch');
const log = require('../ace-log');
const checkDevices = require('../ace-check/checkDevices');

function checkCurrentDir(projectDir) {
  const ohosGradlePath = path.join(projectDir, 'ohos/settings.gradle');
  const androidGradlePath = path.join(projectDir, 'android/settings.gradle');
  try {
    fs.accessSync(ohosGradlePath);
    fs.accessSync(androidGradlePath);
    return true;
  } catch (error) {
    return false;
  }
}

function run(fileType, devices, target) {
  const projectDir = process.cwd();
  if (!checkCurrentDir(projectDir)) {
    console.error(`Please go to your projectDir and run again.`);
    return false;
  }
  const devicesList = checkDevices() || [];
  if (devicesList.length === 0) {
    console.error('No connected device.');
    return false;
  }
  if (fileType === 'hap') {
    compiler(fileType, target);
  } else if (fileType === 'apk') {
    build(fileType, target);
  }
  if (install(fileType, devices, target) && launch(fileType, devices, target)) {
    log(devices);
    console.log('Run successful.');
    return;
  }
  console.error('Run failed.');
}

module.exports = run;