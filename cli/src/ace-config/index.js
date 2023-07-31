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
const os = require('os');
const configPath = process.env.APPDATA ? path.join(process.env.APPDATA, '.aceconfig')
  : path.join(os.homedir(), '.aceconfig');

function setConfig(configs, isPrint) {
  const configContent = getConfig();
  const deleteInfo = [];
  const setInfo = {};
  for (const key in configs) {
    if (configs[key] === true) {
      delete configContent[key];
      deleteInfo.push(key);
    } else {
      if (configs[key]) {
        let configPath = path.resolve(configs[key]);
        if (!fs.existsSync(configPath)) {
          console.error(`Config "${key}" path: "${configs[key]}" not exist.`);
          return;
        }
        if(key === 'arkui-x-sdk') {
          let checkInfo = [];
          let isValid = ArkUIXSdkPathCheck(configPath,checkInfo);
          let logType = '\x1B[33m%s\x1B[0m';
          let logStr = "Warnning: "
          if(!isValid) {
            logType = '\x1B[31m%s\x1B[0m';
            logStr = "Error: "
          }
          checkInfo.forEach((key)=>{
            console.log(logType, logStr+key);
          })
          if (!isValid) {
            return;
          }
        }
        configContent[key] = configPath;
        setInfo[key] = configs[key];
      }
    }
  }
  if (isPrint) {
    deleteInfo.forEach(info => {
      console.log(`Setting "${info}" value to "".`);
    });
    Object.keys(setInfo).forEach(key => {
      console.log(`Setting "${key}" value to "${setInfo[key]}".`);
    });
  }
  fs.writeFileSync(configPath, JSON.stringify(configContent));
}

function getConfig() {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath));
    } catch (err) {
      console.log(err);
      return {};
    }
  } else {
    return {};
  }
}

function ArkUIXSdkPathCheck(sdkPath, info) {
  candidatePath = path.join(sdkPath, '10', 'arkui-x');
  if(!fs.existsSync(candidatePath)) {
    if(info) {
      info.push(`The ArkUI-X Sdk path you configured "${sdkPath}" is incorrect,please refer to https://gitee.com/arkui-x/docs/blob/master/zh-cn/application-dev/tools/how-to-use-arkui-x-sdk.md`);
    }
    return false;
  } 
  candidatePath = path.join(sdkPath, 'licenses');
  if(!fs.existsSync(candidatePath)) {
      if(info) {
        info.push('Licenses of ArkUI-X SDK is missing.');
      }
  }
  return true;
}

module.exports = {
  setConfig: setConfig,
  getConfig: getConfig,
  ArkUIXSdkPathCheck: ArkUIXSdkPathCheck
};
