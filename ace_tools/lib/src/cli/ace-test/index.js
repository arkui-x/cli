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
const install = require('../ace-install');
const launch = require('../ace-launch');
const { isProjectRootDir, validInputDevice } = require('../util');

function test(fileType, device, cmd) {
  const projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (!validInputDevice(device)) {
    return false;
  }
  if (isSimulator(device) && fileType === 'app'){
    console.error('Simulator does not support testing app');
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
  if (fileType !== 'app') {
    installFlag = install(fileType, device, cmd.target);
  }
  if (installFlag && launch(fileType, device, cmd.target, cmd)) {
    return true;
  }
  console.error('Test failed.');
  return false;
}

module.exports = test;
