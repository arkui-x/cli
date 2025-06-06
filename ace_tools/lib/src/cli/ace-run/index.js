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

const compiler = require('../ace-build/ace-compiler');
const { build } = require('../ace-build');
const {install} = require('../ace-install');
const launch = require('../ace-launch');
const { log } = require('../ace-log');
const { isProjectRootDir, validInputDevice, getLaunchModule, validInputModule, getEntryModule } = require('../util');
const { isSimulator } = require('../ace-devices');

function run(fileType, device, cmd) {
  const projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (!validInputDevice(device)) {
    return false;
  }
  const entryModule = getEntryModule(projectDir);
  cmd.target = cmd.target || entryModule;
  const moduleListInput = cmd.target.split(',');
  if (!validInputModule(projectDir, moduleListInput, fileType)) {
    return false;
  }
  if (isSimulator(device) && fileType === 'ios') {
    cmd.simulator = true;
  }
  if (fileType === 'hap' || fileType === 'haphsp') {
    compiler(fileType, cmd);
  } else {
    build(fileType, cmd);
  }
  let installFlag = true;
  installFlag = install(fileType, device, cmd, undefined);
  cmd.target = getLaunchModule(projectDir, cmd.target);
  if (installFlag && cmd.target) {
    if (fileType === 'ios') {
      log(fileType, device, cmd.test);
    }
    if (launch(fileType, device, cmd)) {
      console.log('Run successfully.');
      if (fileType !== 'ios') {
        log(fileType, device, cmd.test);
      }
    } else {
      console.error('Run failed.');
    }
    return;
  }
  console.error('Run failed.');
}

module.exports = run;
