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
const JSON5 = require('json5');
const { getToolByType } = require('../ace-check/getTool');
const { validInputDevice, isProjectRootDir, getCurrentProjectSystem } = require('../util');
const { exit } = require('process');

let toolObj;
let projectDir;
let test;
function log(fileType, device, cmdTest) {
  test = cmdTest;
  projectDir = process.cwd();
  if (!isProjectRootDir(projectDir)) {
    return false;
  }
  if (!validInputDevice(device)) {
    return false;
  }
  const currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  toolObj = getToolByType(fileType, currentSystem, true);
  if (!validTool(toolObj) || !validManifestPath()) {
    return;
  }
  if (test) {
    logCmd(toolObj, device, false, currentSystem);
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
  logCmd(toolObj, device, pid, currentSystem);
}

function logCmd(toolObj, device, pid, currentSystem) {
  let hilog;
  if (device) {
    if ('hdc' in toolObj) {
      if (currentSystem === 'HarmonyOS') {
        hilog = spawn(toolObj['hdc'], ['-t', device, 'hilog', `pid=${pid}`]);
      } else {
        hilog = spawn(toolObj['hdc'], ['-t', device, 'shell', 'hilog', `--pid=${pid}`]);
      }
    } else if ('adb' in toolObj) {
      if (test) {
        execSync(`${toolObj['adb']} shell logcat -c`);
        hilog = spawn(toolObj['adb'], ['-s', device, 'shell', 'logcat']);
      } else {
        hilog = spawn(toolObj['adb'], ['-s', device, 'shell', 'logcat', `--pid=${pid}`]);
      }
    } else if ('idevicesyslog' in toolObj) {
      if (test) {
        hilog = spawn(toolObj['idevicesyslog'], ['-u', device]);
      } else {
        hilog = spawn(toolObj['idevicesyslog'], ['-p', pid], ['-u', device]);
      }
    }
  } else {
    if ('hdc' in toolObj) {
      if (currentSystem === 'HarmonyOS') {
        hilog = spawn(toolObj['hdc'], ['hilog', `pid=${pid}`]);
      } else {
        hilog = spawn(toolObj['hdc'], ['shell', 'hilog', `--pid=${pid}`]);
      }
    } else if ('adb' in toolObj) {
      if (test) {
        execSync(`${toolObj['adb']} shell logcat -c`);
        hilog = spawn(toolObj['adb'], ['shell', 'logcat']);
      } else {
        hilog = spawn(toolObj['adb'], ['shell', 'logcat', `--pid=${pid}`]);
      }
    } else if ('idevicesyslog' in toolObj) {
      if (test) {
        hilog = spawn(toolObj['idevicesyslog']);
      } else {
        hilog = spawn(toolObj['idevicesyslog'], ['-p', pid]);
      }
    }
  }
  handleHilog(hilog);
}

function handleHilog(hilog) {
  hilog.stdout.on('data', data => {
    if (test) {
      logTestCmd(data);
    } else {
      console.log(data.toString());
    }
  });
  hilog.stderr.on('error', error => {
    console.error(error);
  });
  hilog.on('exit code', code => {
    console.log('exit code: ', code.toString());
  });
}

function logTestCmd(data) {
  const output = data.toString();
  try {
    if ('adb' in toolObj) {
      output.split('\n').forEach(item => {
        const identifyStr = 'StageApplicationDelegate';
        if (item.includes(identifyStr)) {
          const index = item.lastIndexOf(identifyStr);
          const subString = item.substring(index + identifyStr.length + 1);
          testReport(subString);
        }
      });
    } else {
      const identifyStr = 'AbilityContextAdapter';
      if (output.includes(identifyStr)) {
        const index = output.lastIndexOf(identifyStr);
        const subString = output.substring(index + identifyStr.length + 13);
        testReport(subString);
      }
    }
  } catch (error) {
    testReport(output);
  }
}

function testReport(data) {
  if (data.includes('OHOS_REPORT')) {
    console.log(data);
  }
  if (data.includes('Tests run')) {
    console.log('user test finished.');
    exit();
  }
}

function validTool(toolObj) {
  if (!toolObj) {
    console.error('No such debug tools (hdc/adb/ios-deploy/idevicesyslog).');
    return false;
  }
  return true;
}

function validManifestPath() {
  if (!fs.existsSync(path.join(projectDir, 'AppScope/app.json5'))) {
    console.error(`Error: run 'ace log' in the project root directory.`);
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
    return getAppPid(device, fileType, bundleName);
  } else {
    try {
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
    } catch (err) {
      return undefined;
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
        if (dataItemArr[bundleIndex] === bundleName) {
          return dataItemArr[1];
        }
      }
    }
  }
}

function getAppPid(device, fileType, bundleName) {
  const toolIosDeploy = getToolByType(fileType);
  if (!validTool(toolIosDeploy)) {
    return undefined;
  }
  try {
    const deviceStr = device ? '--id ' + device : '';
    const output = execSync(`${toolIosDeploy['ios-deploy']} -e --bundle_id ${bundleName} ${deviceStr}`);
    const result = output.indexOf('true') === -1 ? undefined : 'app';
    return result;
  } catch (err) {
    return undefined;
  }
}

function getBundleName() {
  try {
    return JSON5.parse(fs.readFileSync(path.join(projectDir, 'AppScope/app.json5'))).app.bundleName;
  } catch (err) {
    console.log('Get bundle name failed');
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
