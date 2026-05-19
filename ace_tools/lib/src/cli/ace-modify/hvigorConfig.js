/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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

const { getArkuixPluginWithModelVersion } = require('../util/index');
const {
  HVIGORFILE_PATH,
  HVIGOR_CONFIG_PATH,
  HVIGOR_PLUGIN_OHOS,
  HVIGOR_PLUGIN_ARKUIX,
  HVIGOR_TASK_TYPE_MAP,
  REPLACE_PLACEHOLDER_APP_TASKS,
  REPLACE_PLACEHOLDER_APP_TASKS_ARKUIX,
} = require('./constants');
const {
  buildReplaceTask,
  executeReplaceTasks,
  readJson5,
  writeJson5,
  fileExists,
  logWarn,
} = require('./utils');
const { getModulePath } = require('./moduleInfo');

function modifyModuleHvigorInfo(moduleName, moduleType) {
  const modulePath = getModulePath(moduleName);
  if (!modulePath) {
    return;
  }

  const tasks = [
    buildReplaceTask(
      `${modulePath}/hvigorfile.ts`,
      HVIGOR_PLUGIN_OHOS,
      HVIGOR_PLUGIN_ARKUIX
    ),
  ];

  const mapping = HVIGOR_TASK_TYPE_MAP[moduleType];
  if (mapping) {
    tasks.push(
      buildReplaceTask(
        `${modulePath}/hvigorfile.ts`,
        mapping.search,
        mapping.replace
      )
    );
  }

  executeReplaceTasks(tasks);
}

function modifyProjectHvigorInfo() {
  executeReplaceTasks([
    buildReplaceTask(HVIGORFILE_PATH, REPLACE_PLACEHOLDER_APP_TASKS, REPLACE_PLACEHOLDER_APP_TASKS_ARKUIX),
    buildReplaceTask(HVIGORFILE_PATH, HVIGOR_PLUGIN_OHOS, HVIGOR_PLUGIN_ARKUIX),
  ]);

  updateHvigorConfig();
}

function updateHvigorConfig() {
  if (!fileExists(HVIGOR_CONFIG_PATH)) {
    return;
  }

  const jsonObj = readJson5(HVIGOR_CONFIG_PATH);
  if (!jsonObj.dependencies) {
    jsonObj.dependencies = {};
  }

  if (!(HVIGOR_PLUGIN_ARKUIX in jsonObj.dependencies)) {
    if (jsonObj.modelVersion) {
      jsonObj.dependencies[HVIGOR_PLUGIN_ARKUIX] = getArkuixPluginWithModelVersion(jsonObj.modelVersion);
    }
  }

  writeJson5(HVIGOR_CONFIG_PATH, jsonObj);
}

function checkHvigorConfigExists() {
  return fileExists(HVIGOR_CONFIG_PATH);
}

function getHvigorConfig() {
  if (!fileExists(HVIGOR_CONFIG_PATH)) {
    return null;
  }
  return readJson5(HVIGOR_CONFIG_PATH);
}

module.exports = {
  modifyModuleHvigorInfo,
  modifyProjectHvigorInfo,
  updateHvigorConfig,
  checkHvigorConfigExists,
  getHvigorConfig,
};
