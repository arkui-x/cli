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
const os = require('os');
const configPath = process.env.APPDATA ? path.join(process.env.APPDATA, '.aceconfig') : path.join(os.homedir(), '.aceconfig');

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

module.exports = {
  setConfig: setConfig,
  getConfig: getConfig
};
