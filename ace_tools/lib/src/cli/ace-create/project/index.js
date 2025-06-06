/*
 * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
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
const createAar = require('../aar');
const createFramework = require('../framework');
const { getSdkVersion } = require('../../util/index');
const { getConfig } = require('../../ace-config');
const { copy, createPackageFile, replaceInfo, modifyHarmonyOSConfig,
  modifyOpenHarmonyOSConfig, modifyNativeCppConfig, signIOS, copyTemp,
  getFileList, getTempPath, createAndroidAndIosBuildArkTSShell,
  createAndroidTaskInBuildGradle, createIosScriptInPbxproj } = require('../util');
const aceHarmonyOS = '2';
const acePluginNapiProType = 'plugin_napi';
const aceLibraryProType = 'library';
const exec = require('child_process').execSync;
let useCocoapods = false;

function create(args) {
  const { projectAbsolutePath, outputDir, project, bundleName, runtimeOS, template, currentProjectPath, sdkVersion, integrationApproach } = args;
  useCocoapods = (integrationApproach === '2');
  const projectTempPath = getTempPath(outputDir);
  createProject(projectAbsolutePath, projectTempPath, bundleName, project, runtimeOS, template, currentProjectPath, sdkVersion);
  if (useCocoapods) {
    if (!checkCocoaPodsInstalled()) {
      console.error('CocoaPods is not installed. Please install CocoaPods(brew install cocoapods) and try again.');
      return;
    }
    if (!createPodfile(projectTempPath)) {
      console.error('create Podfile failed.');
      return;
    }
  }
  if (template !== aceLibraryProType) {
    createAndroidAndIosShell(projectTempPath);
  }
  copyTemp(projectTempPath, projectAbsolutePath);
  fs.writeFileSync(path.join(projectAbsolutePath, '.projectInfo'),
    `{
    "projectTemplate":"${template}",
    "moduleInfo":[],
    "abilityInfo":[]
}`, 'utf8');
}

function createPodfile(projectTempPath) {
  try {
    exec('pod init', {
      cwd: path.join(projectTempPath, '.arkui-x/ios'),
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    return false;
  }
}

function checkCocoaPodsInstalled() {
  try {
    const output = exec('pod --version', { stdio: 'pipe' });
    return output.toString().trim().length > 0;
  } catch (error) {
    return false;
  }
}

function createAndroidAndIosShell(projectTempPath) {
  createAndroidTaskInBuildGradle(projectTempPath);
  createIosScriptInPbxproj(projectTempPath);
  const version = getSdkVersion(projectTempPath);
  const configContent = getConfig();
  let ohpmPath = '';
  let arkuixPath = '';
  if (configContent['ohpm-dir']) {
    ohpmPath = path.join(configContent['ohpm-dir'], 'bin/ohpm');
  }
  if (configContent['arkui-x-sdk']) {
    arkuixPath = path.join(configContent['arkui-x-sdk'], String(version), 'arkui-x');
  }
  createAndroidAndIosBuildArkTSShell(projectTempPath, ohpmPath, arkuixPath);
}

function repairProject(projectAbsolutePath, outputDir) {
  const projectTempPath = getTempPath(outputDir);
  const absoluteDir = getFileList(projectAbsolutePath);
  const tempDir = getFileList(projectTempPath);
  const absoluteDirReplace = absoluteDir.map(val => val.slice(projectAbsolutePath.length).replaceAll('\\', '/'));
  const tempDirReplace = tempDir.map(val => val.slice(projectTempPath.length).replaceAll('\\', '/'));
  const diffFile = tempDirReplace.filter(value => !absoluteDirReplace.includes(value));
  diffFile.forEach(val => copyTemp(path.join(projectTempPath, val), path.join(projectAbsolutePath, val)));
}

function createProject(projectAbsolutePath, projectTempPath, bundleName, project, runtimeOS, template, currentProjectPath, sdkVersion, isRepairProject) {
  fs.rmSync(projectTempPath, { recursive: true, force: true });
  try {
    fs.mkdirSync(projectTempPath, { recursive: true });
    findStageTemplate(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion);
    if (template === aceLibraryProType) {
      if (!(createAar(projectTempPath, project) && createFramework(projectTempPath, project))) {
        return false;
      }
    }
    let createFlag = 'created';
    if (isRepairProject) {
      if (template !== aceLibraryProType) {
        createAndroidAndIosShell(projectTempPath);
      }
      createFlag = 'repaired';
    }
    if (template !== aceLibraryProType) {
      console.log(`
Project ${createFlag}. Target directory:  ${projectAbsolutePath}.
In order to run your app, type:
    
    $ cd ${currentProjectPath}
    $ ace run
      
Your app code is in ${path.join(currentProjectPath, 'entry')}.`);
      if (useCocoapods) {
        console.info('\x1B[31m%s\x1B[0m', 'The DevEco does not currently support Build APP(s), Please use ace tools to build the project.');
      }
    } else {
      console.log(`
Project ${createFlag}. Target directory:  ${projectAbsolutePath}.
Your library code is in ${path.join(currentProjectPath, 'entry')}.`);
    }
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', `Project created failed! Target directory: ${projectAbsolutePath}. ${error}`);
  }
}

function findStageTemplate(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion) {
  let pathTemplate = path.join(__dirname, 'template');
  if (fs.existsSync(pathTemplate)) {
    copyStageTemplate(pathTemplate, projectTempPath, template, sdkVersion);
    replaceStageProjectInfo(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion);
  } else {
    pathTemplate = globalThis.templatePath;
    if (fs.existsSync(pathTemplate)) {
      copyStageTemplate(pathTemplate, projectTempPath, template, sdkVersion);
      replaceStageProjectInfo(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion);
    } else {
      console.error('\x1B[31m%s\x1B[0m', 'Template is not exist!');
    }
  }
}

function replaceAndroidProjectInfo(projectTempPath, bundleName, project, template) {
  const packageArray = bundleName.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];
  files.push(path.join(projectTempPath, '.arkui-x/android/settings.gradle'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/res/values/strings.xml'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/build.gradle'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push(bundleName + ':entry:EntryAbility:');
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  replaceInfo(files, replaceInfos, strs);
  if (template === acePluginNapiProType) {
    modifyNativeCppConfig(projectTempPath, project, 'app');
  }

  fs.renameSync(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'), path.join(projectTempPath,
    '.arkui-x/android/app/src/main/java/EntryEntryAbilityActivity.java'));
  const aospJavaPath = path.join(projectTempPath, '.arkui-x/android/app/src/main/java');
  const testAospJavaPath = path.join(projectTempPath, '.arkui-x/android/app/src/test/java');
  const androidTestAospJavaPath = path.join(projectTempPath, '.arkui-x/android/app/src/androidTest/java');
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function replaceiOSProjectInfo(projectTempPath, bundleName) {
  const files = [];
  const replaceInfos = [];
  const strs = [];
  const configFile = path.join(projectTempPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj');
  files.push(configFile);
  replaceInfos.push('bundleIdentifier');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate.m'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/ios/app/Info.plist'));
  replaceInfos.push('{{CFBundleName}}');
  const iosCFBundleName = bundleName.split('.').at(-1).toLowerCase();
  strs.push(iosCFBundleName);
  files.push(path.join(projectTempPath, '.arkui-x/ios/app/Info.plist'));
  replaceInfos.push('{{CFBundleDisplayName}}');
  strs.push(iosCFBundleName.slice(0, 1).toUpperCase() + iosCFBundleName.slice(1));
  replaceInfo(files, replaceInfos, strs);
  signIOS(configFile);
}

function replaceStageProjectInfo(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion) {
  if (!bundleName) {
    bundleName = 'com.example.arkuicross';
  }
  const files = [];
  const replaceInfos = [];
  const strs = [];

  files.push(path.join(projectTempPath, 'AppScope/resources/base/element/string.json'));
  replaceInfos.push('projectName');
  strs.push(project);
  files.push(path.join(projectTempPath, 'AppScope/app.json5'));
  replaceInfos.push('appBunduleName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, 'oh-package.json5'));
  replaceInfos.push('packageInfo');
  strs.push(project);
  files.push(path.join(projectTempPath, 'entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/resources/en_US/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/resources/zh_CN/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/module.json5'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/module.json5'));
  replaceInfos.push('module_name');
  strs.push('entry');
  files.push(path.join(projectTempPath, 'entry/src/ohosTest/module.json5'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test');
  files.push(path.join(projectTempPath, 'entry/src/ohosTest/resources/base/element/string.json'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test_desc');
  files.push(path.join(projectTempPath, 'entry/oh-package.json5'));
  replaceInfos.push('module_name');
  strs.push('entry');
  if (template === aceLibraryProType) {
    files.push(path.join(projectTempPath, 'hvigorfile.ts'));
    replaceInfos.push('AppTasksForArkUIX');
    strs.push('AppTasksForArkUIXLibrary');
  }
  if (template === acePluginNapiProType) {
    files.push(path.join(projectTempPath, 'entry/src/main/cpp/CMakeLists.txt'));
    replaceInfos.push('appNameValue');
    strs.push(project);
  }
  replaceInfo(files, replaceInfos, strs);
  if (template !== aceLibraryProType) {
    replaceAndroidProjectInfo(projectTempPath, bundleName, project, template);
    replaceiOSProjectInfo(projectTempPath, bundleName);
  }
  if (runtimeOS !== aceHarmonyOS && sdkVersion !== '10') {
    modifyOpenHarmonyOSConfig(projectTempPath, sdkVersion);
  }
  if (runtimeOS === aceHarmonyOS) {
    modifyHarmonyOSConfig(projectTempPath, 'entry', sdkVersion);
  }
}

function copyAndroidiOSTemplate(templatePath, projectTempPath, template, sdkVersion) {
  if (!copy(path.join(templatePath, '/android'), path.join(projectTempPath, '.arkui-x/android'))) {
    return false;
  }
  if (!copy(path.join((useCocoapods ? path.join(templatePath, 'cocoapods') : templatePath), '/ios'),
    path.join(projectTempPath, '.arkui-x/ios'))) {
    return false;
  }
  if (template === acePluginNapiProType) {
    if (!copy(path.join(templatePath, '/cpp/cpp_android'), path.join(projectTempPath, '.arkui-x/android/app/src/main/cpp'))) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_ios'), path.join(projectTempPath, '.arkui-x/ios/app.xcodeproj'))) {
      return false;
    }
    if (sdkVersion !== '10') {
      let data = fs.readFileSync(path.join(projectTempPath, '.arkui-x/android/app/src/main/cpp/CMakeLists.txt'), 'utf8');
      data = data.replace(`$ENV{ARKUIX_SDK_HOME}/10`, `$ENV{ARKUIX_SDK_HOME}/${sdkVersion}`);
      fs.writeFileSync(path.join(projectTempPath, '.arkui-x/android/app/src/main/cpp/CMakeLists.txt'), data);
    }
  }

  fs.renameSync(path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate_stage.m'),
    path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate.m'));
  fs.renameSync(path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate_stage.h'),
    path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate.h'));
  return true;
}

function copyStageTemplate(templatePath, projectTempPath, template, sdkVersion) {
  if (!copy(path.join(templatePath, '/ohos_stage'), projectTempPath)) {
    return false;
  }
  if (template === acePluginNapiProType) {
    if (!copy(path.join(templatePath, '/cpp_ets_stage/source'), projectTempPath)) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_src'), path.join(projectTempPath, 'entry/src/main/cpp'))) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_ohos'), path.join(projectTempPath, 'entry/src/main/cpp'))) {
      return false;
    }
  } else {
    if (!copy(path.join(templatePath, '/ets_stage/source'), projectTempPath)) {
      return false;
    }
  }
  fs.mkdirSync(path.join(projectTempPath, '.arkui-x'), { recursive: true });
  fs.writeFileSync(path.join(projectTempPath, '.arkui-x/arkui-x-config.json5'), fs.readFileSync(path.join(templatePath, 'arkui-x-config.json5').toString()));
  if (template !== aceLibraryProType) {
    if (!copyAndroidiOSTemplate(templatePath, projectTempPath, template, sdkVersion)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  create,
  repairProject,
  createProject,
};
