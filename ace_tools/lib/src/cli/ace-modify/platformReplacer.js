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

const {
  ANDROID_SETTINGS_GRADLE,
  ANDROID_STRINGS_XML,
  ANDROID_MANIFEST,
  ANDROID_BUILD_GRADLE,
  ANDROID_MAIN_ACTIVITY,
  ANDROID_MY_APPLICATION,
  ANDROID_INSTRUMENTED_TEST,
  ANDROID_UNIT_TEST,
  IOS_PROJECT_PBXPROJ,
  IOS_APP_DELEGATE_M,
  IOS_VC_FILES,
  ANDROID_JAVA_BASE,
  REPLACE_PLACEHOLDER_APP_NAME,
  REPLACE_PLACEHOLDER_PACKAGE_NAME,
  REPLACE_PLACEHOLDER_BUNDLE_IDENTIFIER,
  REPLACE_PLACEHOLDER_PACKAGE_DECL,
  REPLACE_PLACEHOLDER_ARKUI_INSTANCE_NAME,
  REPLACE_PLACEHOLDER_MAIN_ACTIVITY,
  REPLACE_PLACEHOLDER_ENTRY_VC,
  REPLACE_PLACEHOLDER_ENTRY_MODULE,
  REPLACE_PLACEHOLDER_ENTRY_ABILITY,
} = require('./constants');
const { buildReplaceTask, executeReplaceTasks, safeRenameSync } = require('./utils');
const { getModuleAbility } = require('./moduleInfo');
const { buildActivityName, buildViewControllerName } = require('./constants');
const { createPackageFile } = require('./fileOperations');
const { ANDROID_PACKAGE_JAVA_DIRS } = require('./constants');

function buildAndroidProjectReplaceTasks(appName, packageName) {
  return [
    buildReplaceTask(ANDROID_SETTINGS_GRADLE, REPLACE_PLACEHOLDER_APP_NAME, packageName),
    buildReplaceTask(ANDROID_STRINGS_XML, REPLACE_PLACEHOLDER_APP_NAME, packageName),
    buildReplaceTask(ANDROID_MANIFEST, REPLACE_PLACEHOLDER_PACKAGE_NAME, appName),
    buildReplaceTask(ANDROID_BUILD_GRADLE, REPLACE_PLACEHOLDER_PACKAGE_NAME, appName),
    buildReplaceTask(ANDROID_MAIN_ACTIVITY, REPLACE_PLACEHOLDER_PACKAGE_DECL, `package ${appName}`),
    buildReplaceTask(ANDROID_MY_APPLICATION, REPLACE_PLACEHOLDER_PACKAGE_DECL, `package ${appName}`),
    buildReplaceTask(ANDROID_INSTRUMENTED_TEST, REPLACE_PLACEHOLDER_PACKAGE_DECL, `package ${appName}`),
    buildReplaceTask(ANDROID_UNIT_TEST, REPLACE_PLACEHOLDER_PACKAGE_DECL, `package ${appName}`),
  ];
}

function buildIOSProjectReplaceTasks(appName) {
  return [
    buildReplaceTask(IOS_PROJECT_PBXPROJ, REPLACE_PLACEHOLDER_BUNDLE_IDENTIFIER, appName),
    buildReplaceTask(IOS_APP_DELEGATE_M, REPLACE_PLACEHOLDER_PACKAGE_NAME, appName),
  ];
}

function replaceAndroidProjectInfo(appName, packageName) {
  executeReplaceTasks(buildAndroidProjectReplaceTasks(appName, packageName));
}

function replaceIOSProjectInfo(appName) {
  executeReplaceTasks(buildIOSProjectReplaceTasks(appName));
}

function buildCrossModuleAndroidTasks(appName, moduleName, abilityName, activityName) {
  return [
    buildReplaceTask(ANDROID_MAIN_ACTIVITY, REPLACE_PLACEHOLDER_ARKUI_INSTANCE_NAME, `${appName}:${moduleName}:${abilityName}:`),
    buildReplaceTask(ANDROID_MAIN_ACTIVITY, REPLACE_PLACEHOLDER_MAIN_ACTIVITY, activityName),
    buildReplaceTask(ANDROID_MANIFEST, REPLACE_PLACEHOLDER_MAIN_ACTIVITY, activityName),
  ];
}

function buildCrossModuleIOSTasks(moduleName, abilityName, viewControllerName) {
  const tasks = [];
  for (const file of IOS_VC_FILES) {
    tasks.push(buildReplaceTask(file, REPLACE_PLACEHOLDER_ENTRY_VC, viewControllerName));
  }
  tasks.push(
    buildReplaceTask(IOS_APP_DELEGATE_M, REPLACE_PLACEHOLDER_ENTRY_MODULE, `"${moduleName}"`),
    buildReplaceTask(IOS_APP_DELEGATE_M, REPLACE_PLACEHOLDER_ENTRY_ABILITY, `"${abilityName}"`),
  );
  return tasks;
}

function modifyCrossModule(moduleName, appName, platforms) {
  const abilityName = getModuleAbility(moduleName);
  const activityName = buildActivityName(moduleName, abilityName);
  const viewControllerName = buildViewControllerName(moduleName, abilityName);

  const { isAndroid, isIOS } = require('./constants');
  const tasks = [];

  if (isAndroid(platforms)) {
    tasks.push(...buildCrossModuleAndroidTasks(appName, moduleName, abilityName, activityName));
  }
  if (isIOS(platforms)) {
    tasks.push(...buildCrossModuleIOSTasks(moduleName, abilityName, viewControllerName));
  }

  executeReplaceTasks(tasks);

  if (isAndroid(platforms)) {
    safeRenameSync(
      ANDROID_MAIN_ACTIVITY,
      `./.arkui-x/android/app/src/main/java/${activityName}.java`
    );
  }
  if (isIOS(platforms)) {
    safeRenameSync(
      './.arkui-x/ios/app/EntryEntryAbilityViewController.m',
      `./.arkui-x/ios/app/${viewControllerName}.m`
    );
    safeRenameSync(
      './.arkui-x/ios/app/EntryEntryAbilityViewController.h',
      `./.arkui-x/ios/app/${viewControllerName}.h`
    );
  }
}

function modifyDirStructure(appName) {
  const packageArray = appName.split('.');
  createPackageFile(ANDROID_PACKAGE_JAVA_DIRS, packageArray);
}

module.exports = {
  buildAndroidProjectReplaceTasks,
  buildIOSProjectReplaceTasks,
  replaceAndroidProjectInfo,
  replaceIOSProjectInfo,
  buildCrossModuleAndroidTasks,
  buildCrossModuleIOSTasks,
  modifyCrossModule,
  modifyDirStructure,
};
