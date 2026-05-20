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

const PLATFORM_ANDROID = 'android';
const PLATFORM_IOS = 'ios';
const PLATFORM_BOTH = 'both';

const MODIFY_TYPE_PROJECT = 0;
const MODIFY_TYPE_MODULES = 1;

const MODULE_TYPE_ENTRY = 'entry';
const MODULE_TYPE_FEATURE = 'feature';
const MODULE_TYPE_SHARED = 'shared';
const MODULE_TYPE_HAR = 'har';

const CROSS_PLATFORM_MODULE_TYPES = [
  MODULE_TYPE_ENTRY,
  MODULE_TYPE_FEATURE,
  MODULE_TYPE_SHARED,
];

const BUILD_PROFILE_PATH = './build-profile.json5';
const APP_JSON5_PATH = './APPScope/app.json5';
const STRING_RESOURCE_PATH = './APPScope/resources/base/element/string.json';
const PROJECT_INFO_PATH = './.projectInfo';
const ARKUIX_CONFIG_PATH = './.arkui-x/arkui-x-config.json5';
const ARKUIX_DIR = './.arkui-x';
const HVIGORFILE_PATH = './hvigorfile.ts';
const HVIGOR_CONFIG_PATH = './hvigor/hvigor-config.json5';

const ANDROID_DIR = './.arkui-x/android';
const IOS_DIR = './.arkui-x/ios';

const ANDROID_SETTINGS_GRADLE = './.arkui-x/android/settings.gradle';
const ANDROID_STRINGS_XML = './.arkui-x/android/app/src/main/res/values/strings.xml';
const ANDROID_MANIFEST = './.arkui-x/android/app/src/main/AndroidManifest.xml';
const ANDROID_BUILD_GRADLE = './.arkui-x/android/app/build.gradle';
const ANDROID_MAIN_ACTIVITY = './.arkui-x/android/app/src/main/java/MainActivity.java';
const ANDROID_MY_APPLICATION = './.arkui-x/android/app/src/main/java/MyApplication.java';
const ANDROID_INSTRUMENTED_TEST = './.arkui-x/android/app/src/androidTest/java/ExampleInstrumentedTest.java';
const ANDROID_UNIT_TEST = './.arkui-x/android/app/src/test/java/ExampleUnitTest.java';

const ANDROID_JAVA_BASE = './.arkui-x/android/app/src/main/java';
const ANDROID_TEST_JAVA_BASE = './.arkui-x/android/app/src/test/java';
const ANDROID_INSTRUMENTED_JAVA_BASE = './.arkui-x/android/app/src/androidTest/java';

const IOS_PROJECT_PBXPROJ = './.arkui-x/ios/app.xcodeproj/project.pbxproj';
const IOS_APP_DELEGATE_M = './.arkui-x/ios/app/AppDelegate.m';
const IOS_ENTRY_VC_M = './.arkui-x/ios/app/EntryEntryAbilityViewController.m';
const IOS_ENTRY_VC_H = './.arkui-x/ios/app/EntryEntryAbilityViewController.h';
const IOS_INFO_PLIST = './.arkui-x/ios/app/Info.plist';

const HVIGOR_PLUGIN_OHOS = '@ohos/hvigor-ohos-plugin';
const HVIGOR_PLUGIN_ARKUIX = '@ohos/hvigor-ohos-arkui-x-plugin';

const HVIGOR_TASK_TYPE_MAP = Object.freeze({
  [MODULE_TYPE_ENTRY]: { search: 'hapTasks', replace: 'HapTasks' },
  [MODULE_TYPE_FEATURE]: { search: 'hapTasks', replace: 'HapTasks' },
  [MODULE_TYPE_SHARED]: { search: 'hspTasks', replace: 'HspTasks' },
});

const FILE_NAME_MAP = Object.freeze({
  'AppDelegate_stage.h': 'AppDelegate.h',
  'AppDelegate_stage.m': 'AppDelegate.m',
});

const REPLACE_PLACEHOLDER_APP_NAME = 'appName';
const REPLACE_PLACEHOLDER_PACKAGE_NAME = 'packageName';
const REPLACE_PLACEHOLDER_BUNDLE_IDENTIFIER = 'bundleIdentifier';
const REPLACE_PLACEHOLDER_PACKAGE_DECL = 'package packageName';
const REPLACE_PLACEHOLDER_ARKUI_INSTANCE_NAME = 'ArkUIInstanceName';
const REPLACE_PLACEHOLDER_MAIN_ACTIVITY = 'MainActivity';
const REPLACE_PLACEHOLDER_ENTRY_VC = 'EntryEntryAbilityViewController';
const REPLACE_PLACEHOLDER_ENTRY_MODULE = '"entry"';
const REPLACE_PLACEHOLDER_ENTRY_ABILITY = '"EntryAbility"';
const REPLACE_PLACEHOLDER_APP_TASKS = 'appTasks';
const REPLACE_PLACEHOLDER_APP_TASKS_ARKUIX = 'AppTasksForArkUIX';

const BUILD_PROFILE_PROBLEM_KEY = 'useNormalizedOHMUrl';

const PROJECT_INFO_TEMPLATE = Object.freeze({
  projectTemplate: 'app',
  moduleInfo: [],
  abilityInfo: [],
});

const IOS_VC_FILES = Object.freeze([
  IOS_ENTRY_VC_M,
  IOS_ENTRY_VC_H,
  IOS_APP_DELEGATE_M,
  IOS_PROJECT_PBXPROJ,
]);

const ANDROID_PACKAGE_JAVA_DIRS = Object.freeze([
  ANDROID_JAVA_BASE,
  ANDROID_TEST_JAVA_BASE,
  ANDROID_INSTRUMENTED_JAVA_BASE,
]);

function isAndroid(platforms) {
  return platforms === PLATFORM_ANDROID || platforms === PLATFORM_BOTH;
}

function isIOS(platforms) {
  return platforms === PLATFORM_IOS || platforms === PLATFORM_BOTH;
}

function isCrossPlatformModule(type) {
  return CROSS_PLATFORM_MODULE_TYPES.includes(type);
}

function capitalize(str) {
  if (!str || str.length === 0) {
    return str;
  }
  return str[0].toUpperCase() + str.slice(1);
}

function buildActivityName(moduleName, abilityName) {
  return `${capitalize(moduleName)}${abilityName}Activity`;
}

function buildViewControllerName(moduleName, abilityName) {
  return `${capitalize(moduleName)}${abilityName}ViewController`;
}

module.exports = {
  PLATFORM_ANDROID,
  PLATFORM_IOS,
  PLATFORM_BOTH,
  MODIFY_TYPE_PROJECT,
  MODIFY_TYPE_MODULES,
  MODULE_TYPE_ENTRY,
  MODULE_TYPE_FEATURE,
  MODULE_TYPE_SHARED,
  MODULE_TYPE_HAR,
  CROSS_PLATFORM_MODULE_TYPES,
  BUILD_PROFILE_PATH,
  APP_JSON5_PATH,
  STRING_RESOURCE_PATH,
  PROJECT_INFO_PATH,
  ARKUIX_CONFIG_PATH,
  ARKUIX_DIR,
  HVIGORFILE_PATH,
  HVIGOR_CONFIG_PATH,
  ANDROID_DIR,
  IOS_DIR,
  ANDROID_SETTINGS_GRADLE,
  ANDROID_STRINGS_XML,
  ANDROID_MANIFEST,
  ANDROID_BUILD_GRADLE,
  ANDROID_MAIN_ACTIVITY,
  ANDROID_MY_APPLICATION,
  ANDROID_INSTRUMENTED_TEST,
  ANDROID_UNIT_TEST,
  ANDROID_JAVA_BASE,
  ANDROID_TEST_JAVA_BASE,
  ANDROID_INSTRUMENTED_JAVA_BASE,
  IOS_PROJECT_PBXPROJ,
  IOS_APP_DELEGATE_M,
  IOS_ENTRY_VC_M,
  IOS_ENTRY_VC_H,
  IOS_INFO_PLIST,
  HVIGOR_PLUGIN_OHOS,
  HVIGOR_PLUGIN_ARKUIX,
  HVIGOR_TASK_TYPE_MAP,
  FILE_NAME_MAP,
  REPLACE_PLACEHOLDER_APP_NAME,
  REPLACE_PLACEHOLDER_PACKAGE_NAME,
  REPLACE_PLACEHOLDER_BUNDLE_IDENTIFIER,
  REPLACE_PLACEHOLDER_PACKAGE_DECL,
  REPLACE_PLACEHOLDER_ARKUI_INSTANCE_NAME,
  REPLACE_PLACEHOLDER_MAIN_ACTIVITY,
  REPLACE_PLACEHOLDER_ENTRY_VC,
  REPLACE_PLACEHOLDER_ENTRY_MODULE,
  REPLACE_PLACEHOLDER_ENTRY_ABILITY,
  REPLACE_PLACEHOLDER_APP_TASKS,
  REPLACE_PLACEHOLDER_APP_TASKS_ARKUIX,
  BUILD_PROFILE_PROBLEM_KEY,
  PROJECT_INFO_TEMPLATE,
  IOS_VC_FILES,
  ANDROID_PACKAGE_JAVA_DIRS,
  isAndroid,
  isIOS,
  isCrossPlatformModule,
  capitalize,
  buildActivityName,
  buildViewControllerName,
};
