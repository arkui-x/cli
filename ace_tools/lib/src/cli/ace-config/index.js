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
const { checkPath } = require('../ace-check/checkPathLawful');
const configPath = process.env.APPDATA ? path.join(process.env.APPDATA, '.aceconfig')
  : path.join(os.homedir(), '.aceconfig');

function setConfig(configs, isPrint) {
  const deleteInfo = [];
  const setInfo = {};
  const configContent = getConfig();
  for (const key in configs) {
    if (configs[key] === true) {
      delete configContent[key];
      deleteInfo.push(key);
    } else {
      if (configs[key]) {
        const configPath = path.resolve(configs[key]);
        if (!checkPath(key, configs[key])) {
          continue;
        }
        configContent[key] = configPath;
        setInfo[key] = configs[key];
        console.info(`Set "${key}" value to "${setInfo[key]}" succeeded.`);
      } else if (typeof configs[key] !== 'undefined') {
        modifyConfigPath(key, configs[key]);
      }
    }
  }
  if (isPrint) {
    deleteInfo.forEach(info => {
      console.log(`Setting "${info}" value to "".`);
    });
    Object.keys(setInfo).forEach(key => {
      console.info(`Set "${key}" value to "${setInfo[key]}" succeeded.`);
    });
  }
  fs.writeFileSync(configPath, JSON.stringify(configContent));
}

function getConfig() {
  if (fs.existsSync(configPath)) {
    try {
      const readConfigPath = fs.readFileSync(configPath, 'utf-8');
      if (readConfigPath) {
        return JSON.parse(readConfigPath);
      } else {
        return {};
      }
    } catch (err) {
      return {};
    }
  } else {
    return {};
  }
}

function convertKey(key) {
  let typekey = key;
  if (key === 'Android') {
    typekey = 'android-sdk';
  }
  if (key === 'Android Studio') {
    typekey = 'android-studio-path';
  }
  if (key === 'ArkUI-X') {
    typekey = 'arkui-x-sdk';
  }
  if (key === 'DevEco Studio') {
    typekey = 'deveco-studio-path';
  }
  if (key === 'HarmonyOS') {
    typekey = 'harmonyos-sdk';
  }
  if (key === 'OpenHarmony') {
    typekey = 'openharmony-sdk';
  }
  return typekey;
}

function modifyConfigPath(key, path) {
  const configContent = getConfig();
  const typekey = convertKey(key);
  if (path) {
    configContent[typekey] = path;
  } else if (typekey in configContent) {
    delete configContent[typekey];
  }
  fs.writeFileSync(configPath, JSON.stringify(configContent));
}

module.exports = {
  setConfig,
  getConfig,
  modifyConfigPath
};
