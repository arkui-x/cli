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

const compiler = require('./ace-compiler');
const packager = require('./ace-packager');
const { getConfig } = require('../ace-config');
const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

function build(target, cmd) {
  if (checkVersion() && compiler(target, cmd)) {
    packager(target, cmd);
  }
}

function checkVersion() {
  const apiVersion = getProjectApiVersion();
  const devVersion = getDevVersion();
  const runtimeOSStr = getRuntimeOS();
  if (runtimeOSStr !== "HarmonyOS" || apiVersion <= 11) {
    return true;
  }
  if (apiVersion > devVersion) {
    console.log(`error: current devEco is not support apiVersion:${apiVersion},please upgrade devEco`);
    return false;
  } else if (apiVersion < devVersion) {
    console.log('error: not find project configuration sdk,The project structure and configuration need to be upgraded before use.');
    return false;
  } else {
    return true;
  }
}

function getRuntimeOS() {
  const projectDir = process.cwd();
  const buildProfileFilePath = `${projectDir}/build-profile.json5`;
  const data = fs.readFileSync(buildProfileFilePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  let runtimeOSStr = "";
  if (jsonObj.app.products.length > 0) {
    runtimeOSStr = jsonObj.app.products[0].runtimeOS
  }
  return runtimeOSStr;
}

function getProjectApiVersion() {
  const projectDir = process.cwd();
  const hvigorConfigFilePath = `${projectDir}/hvigor/hvigor-config.json5`;
  const data = fs.readFileSync(hvigorConfigFilePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  const modelVersion = jsonObj.modelVersion;
  let ApiVersion = 11;
  if (modelVersion && modelVersion !== undefined) {
    if (modelVersion === '5.0.0') {
      ApiVersion = 12;
    } else if (modelVersion === '5.0.1') {
      ApiVersion = 13;
    } else if (modelVersion === '5.0.2') {
      ApiVersion = 14;
    } else {
      ApiVersion = 11;
    }
  }
  return ApiVersion;
}

function getDevVersion() {
  const config = getConfig();
  const devDir = config['deveco-studio-path'];
  const devSdkPath = `${devDir}/Contents/sdk/default/sdk-pkg.json`;
  const data = fs.readFileSync(devSdkPath, 'utf8');
  const jsonObj = JSON5.parse(data);
  const devVersion = jsonObj.data.apiVersion;
  const devVersionNumber = Number(devVersion);
  return devVersionNumber;
}

module.exports = build;
