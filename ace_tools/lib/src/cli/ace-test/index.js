/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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
const build = require('../ace-build');
const {install, isInstallFileExist} = require('../ace-install');
const launch = require('../ace-launch');
const { isProjectRootDir, validInputDevice } = require('../util');
const { isSimulator } = require('../ace-devices/index');

function test(fileType, device, cmd) {
  const projectDir = process.cwd();
  if (!cmd.path && !isProjectRootDir(projectDir)) {
    return false;
  }
  if (!validInputDevice(device)) {
    return false;
  }
  if (isSimulator(device) && fileType === 'ios'){
    console.error('Simulator does not support testing ios');
    return false;
  }
  if(cmd.skipInstall){
    if(launch(fileType, device, cmd)){
      return true;
    }
    console.error('Skip install and test failed.');
    return false;
  }
  if (cmd.path) {
    if (!isInstallFileExist(fileType, cmd.path)) {
      return false;
    }
    let installFlag = true;
    cmd.target = cmd.target || 'entry';
    installFlag = install(fileType, device, cmd.target, cmd.path);
    if (installFlag && launch(fileType, device, cmd)) {
      return true;
    }
    console.error('Test failed.');
    return false;
  }
  if (fileType === 'hap') {
    compiler(fileType, cmd);
  } else {
    build(fileType, cmd);
  }
  let installFlag = true;
  cmd.target = cmd.target || 'entry';
  // ios launch command contain install
  installFlag = install(fileType, device, cmd.target, undefined);
  if (installFlag && launch(fileType, device, cmd)) {
    return true;
  }
  console.error('Test failed.');
  return false;
}

module.exports = test;
