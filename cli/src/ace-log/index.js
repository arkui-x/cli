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

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const { getToolByType } = require('../ace-check/getTool');
const { validInputDevice, getManifestPath, getCurrentProjectVersion, isStageProject,
  isProjectRootDir, getCurrentProjectSystem } = require('../util');

let toolObj;
let projectDir;
function log(fileType, device) {
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  const currentSystem = getCurrentProjectSystem(projectDir)
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  toolObj = getToolByType(fileType, currentSystem, true);
  if (!validTool(toolObj) || !validInputDevice(device) || !validManifestPath()) {
    return;
  }
  let pid = getPid(device, fileType);
  const sleepTime = 1000;
  const timeOutCount = 5;
  if (!pid) {
    for (let i = 0; i < timeOutCount; i++) {
      sleep(sleepTime);
      pid = getPid(device, fileType);
      if (pid) {
        break;
      }
    }
  }
  if (!validPid(pid)) {
    return;
  }
  logCmd(toolObj, device, pid);
}

function logCmd(toolObj, device, pid) {
  let hilog;
  if (device) {
    if ('hdc' in toolObj) {
      hilog = spawn(toolObj['hdc'], ['-t', device, 'shell', 'hilog', `--pid=${pid}`]);
    } else if ('adb' in toolObj) {
      hilog = spawn(toolObj['adb'], ['-s', device, 'shell', 'logcat', `--pid=${pid}`]);
    } else if ('idevicesyslog' in toolObj) {
      hilog = spawn(toolObj['idevicesyslog'], ['-p', pid], ['-u', device]);
    }
  } else {
    if ('hdc' in toolObj) {
      hilog = spawn(toolObj['hdc'], ['shell', 'hilog', `--pid=${pid}`]);
    } else if ('adb' in toolObj) {
      hilog = spawn(toolObj['adb'], ['shell', 'logcat', `--pid=${pid}`]);
    } else if ('idevicesyslog' in toolObj) {
      hilog = spawn(toolObj['idevicesyslog'], ['-p', pid]);
    }
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

function validTool(toolObj) {
  if (!toolObj) {
    console.error('No such debug tools (hdc/adb/ios-deploy/idevicesyslog).');
    return false;
  }
  return true;
}

function validManifestPath() {
  if (isStageProject(path.join(projectDir, 'ohos'))) {
    if (!fs.existsSync(path.join(projectDir, 'ohos/AppScope/app.json5'))) {
      console.error(`Error: run 'ace log' in the project root directory. no such file, '${bundleNamePath}'.`);
      return false;
    }
    return true;
  }
  const bundleNamePath = getManifestPath(projectDir);
  if (!bundleNamePath || !fs.existsSync(bundleNamePath)) {
    console.error(`Error: run 'ace log' in the project root directory. no such file, '${bundleNamePath}'.`);
    return false;
  }
  return true;
}

function validPid(pid) {
  if (!pid) {
    console.error(`Error: no such application bundle (${getBundleName()}) in the device.`);
    return false;
  }
  return true;
}

function getPid(device, fileType) {
  let hilog;
  const bundleName = getBundleName();
  if (!bundleName) {
    return;
  }
  if (fileType === 'app') {
    const toolIosDeploy = getToolByType(fileType);
    if (!validTool(toolIosDeploy)) {
      return undefined;
    }
    const deviceStr = device ? '--id ' + device : '';
    const output = execSync(`${toolIosDeploy['ios-deploy']} -e --bundle_id ${bundleName} ${deviceStr}`);
    const result = output.indexOf('true') == -1 ? undefined : getPName();
    return result;
  } else {
    if (device) {
      if ('hdc' in toolObj) {
        hilog = execSync(`${toolObj['hdc']} -t ${device} shell "ps -ef|grep ${bundleName} |grep -v grep"`);
      } else if ('adb' in toolObj) {
        hilog = execSync(`${toolObj['adb']} -s ${device} shell "ps -ef|grep ${bundleName} |grep -v grep"`);
      } else {
        return undefined;
      }
    } else {
      if ('hdc' in toolObj) {
        hilog = execSync(`${toolObj['hdc']} shell "ps -ef|grep ${bundleName} |grep -v grep"`);
      } else if ('adb' in toolObj) {
        hilog = execSync(`${toolObj['adb']} shell "ps -ef|grep ${bundleName} |grep -v grep"`);
      } else {
        return undefined;
      }
    }
    const PID_REG = new RegExp(`\\S+\\s+(\\d+).+${bundleName}`, 'g');
    const dataArr = hilog.toString().split('\r\n');
    for (let i = 0; i < dataArr.length; i++) {
      const dataItem = dataArr[i];
      if (PID_REG.test(dataItem)) {
        let pidData = dataItem.match(PID_REG)[0];
        pidData = pidData.replace(/\s+/ig, ' ');
        const dataItemArr = pidData.split(' ');
        const bundleIndex = 7;
        if (dataItemArr[bundleIndex] == bundleName) {
          return dataItemArr[1];
        }
      }
    }
  }
}

function getBundleName() {
  let bundleNamePath;
  try {
    if (isStageProject(path.join(projectDir, 'ohos'))) {
      return JSON.parse(fs.readFileSync(path.join(projectDir, 'ohos/AppScope/app.json5'))).app.bundleName;
    }
    bundleNamePath = getManifestPath(projectDir);
    if (bundleNamePath) {
      return JSON.parse(fs.readFileSync(bundleNamePath)).appID;
    }
  } catch (err) {
    console.log('Get bundle name failed');
  }
}

function getPName() {
  if (isStageProject(path.join(projectDir, 'ohos'))) {
    return 'etsapp';
  }
  if (getCurrentProjectVersion(projectDir) == 'ets') {
    return 'etsapp';
  } else {
    return 'jsapp';
  }
}
function sleep(sleepTime) {
  const beginTime = new Date().getTime();
  while (true) {
    if (new Date().getTime() - beginTime > sleepTime) {
      break;
    }
  }
}
module.exports = log;
