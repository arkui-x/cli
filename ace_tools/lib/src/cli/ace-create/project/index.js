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
const inquirer = require('inquirer');
const createAar = require('../aar');
const createFramework = require('../framework');
const { copy, rmdir, createPackageFile, replaceInfo, modifyHarmonyOSConfig,
  modifyOpenHarmonyOSConfig, modifyNativeCppConfig, signIOS } = require('../util');
const aceHarmonyOS = '2';
const aceTemplateNC = '2';
const aceProType = '2';

function create(args) {
  const question = [{
    name: 'delete',
    type: 'input',
    message: 'The project already exists. Do you want to delete the directory (y / n):',
    validate(val) {
      if (val.toLowerCase() !== 'y' && val.toLowerCase() !== 'n') {
        return 'Please enter y / n!';
      } else {
        return true;
      }
    }
  }];
  const { outputDir, project, bundleName, runtimeOS, proType, template, currentProjectPath, sdkVersion } = args;
  const projectPath = outputDir;
  if (fs.existsSync(project)) {
    question.message = question.message + projectPath;
    inquirer.prompt(question).then(answers => {
      if (answers.delete === 'y') {
        try {
          rmdir(projectPath);
          console.log('Delete directory successfully, creating new project.');
        } catch (err) {
          console.log(`Failed to delete ${projectPath}, please delete it do yourself.`);
        }
        createProject(projectPath, bundleName, project, runtimeOS, proType, template, currentProjectPath, sdkVersion);
      } else {
        console.log('Failed to create project, project directory already exists.');
      }
    });
  } else {
    createProject(projectPath, bundleName, project, runtimeOS, proType, template, currentProjectPath, sdkVersion);
  }
}

function createProject(projectPath, bundleName, project, runtimeOS, proType, template, currentProjectPath, sdkVersion) {
  try {
    fs.mkdirSync(projectPath, { recursive: true });
    findStageTemplate(projectPath, bundleName, project, runtimeOS, proType, template, sdkVersion);
    if (proType === aceProType) {
      if (!(createAar(projectPath, project) && createFramework(projectPath, project))) {
        return false;
      }
    }
    console.log(`
Project created successfully! Target directory:  ${projectPath}.

In order to run your application, type:
    
    $ cd ${currentProjectPath}
    $ ace run
      
Your application code is in ${path.join(currentProjectPath, 'entry')}.`);
  } catch (error) {
    console.log('Project created failed! Target directory: ' + projectPath + '.' + error);
  }
}

function findStageTemplate(projectPath, bundleName, project, runtimeOS, proType, template, sdkVersion) {
  let pathTemplate = path.join(__dirname, 'template');
  if (fs.existsSync(pathTemplate)) {
    copyStageTemplate(pathTemplate, projectPath, proType, template, sdkVersion);
    replaceStageProjectInfo(projectPath, bundleName, project, runtimeOS, proType, template, sdkVersion);
  } else {
    pathTemplate = globalThis.templatePath;
    if (fs.existsSync(pathTemplate)) {
      copyStageTemplate(pathTemplate, projectPath, proType, template, sdkVersion);
      replaceStageProjectInfo(projectPath, bundleName, project, runtimeOS, proType, template, sdkVersion);
    } else {
      console.log('Error: Template is not exist!');
    }
  }
}

function replaceAndroidProjectInfo(projectPath, bundleName, project, template) {
  const packageArray = bundleName.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];
  files.push(path.join(projectPath, '.arkui-x/android/settings.gradle'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/res/values/strings.xml'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectPath, '.arkui-x/android/app/build.gradle'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push(bundleName + ':entry:EntryAbility:');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  if (template === aceTemplateNC) {
    modifyNativeCppConfig(projectPath, files, replaceInfos, strs, project);
  }
  replaceInfo(files, replaceInfos, strs);

  fs.renameSync(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'), path.join(projectPath,
    '.arkui-x/android/app/src/main/java/EntryEntryAbilityActivity.java'));
  const aospJavaPath = path.join(projectPath, '.arkui-x/android/app/src/main/java');
  const testAospJavaPath = path.join(projectPath, '.arkui-x/android/app/src/test/java');
  const androidTestAospJavaPath = path.join(projectPath, '.arkui-x/android/app/src/androidTest/java');
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function replaceiOSProjectInfo(projectPath, bundleName) {
  const files = [];
  const replaceInfos = [];
  const strs = [];
  const configFile = path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj');
  files.push(configFile);
  replaceInfos.push('bundleIdentifier');
  strs.push(bundleName);
  files.push(path.join(projectPath, '.arkui-x/ios/app/AppDelegate.m'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectPath, '.arkui-x/ios/app/Info.plist'));
  replaceInfos.push('{{CFBundleName}}');
  let iosCFBundleName = bundleName.split('.').at(-1).toLowerCase();
  strs.push(iosCFBundleName);
  files.push(path.join(projectPath, '.arkui-x/ios/app/Info.plist'));
  replaceInfos.push('{{CFBundleDisplayName}}');
  strs.push(iosCFBundleName.slice(0, 1).toUpperCase() + iosCFBundleName.slice(1));
  replaceInfo(files, replaceInfos, strs);
  signIOS(configFile);
}

function replaceStageProjectInfo(projectPath, bundleName, project, runtimeOS, proType, template, sdkVersion) {
  if (!bundleName) {
    bundleName = 'com.example.arkuicross';
  }
  const files = [];
  const replaceInfos = [];
  const strs = [];

  files.push(path.join(projectPath, 'AppScope/resources/base/element/string.json'));
  replaceInfos.push('projectName');
  strs.push(project);
  files.push(path.join(projectPath, 'AppScope/app.json5'));
  replaceInfos.push('appBunduleName');
  strs.push(bundleName);
  files.push(path.join(projectPath, 'oh-package.json5'));
  replaceInfos.push('packageInfo');
  strs.push(project);
  files.push(path.join(projectPath, 'entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectPath, 'entry/src/main/resources/en_US/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectPath, 'entry/src/main/resources/zh_CN/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectPath, 'entry/src/main/module.json5'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectPath, 'entry/src/main/module.json5'));
  replaceInfos.push('module_name');
  strs.push('entry');
  files.push(path.join(projectPath, 'entry/src/ohosTest/module.json5'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test');
  files.push(path.join(projectPath, 'entry/src/ohosTest/resources/base/element/string.json'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test_desc');
  files.push(path.join(projectPath, 'entry/oh-package.json5'));
  replaceInfos.push('module_name');
  strs.push('entry');
  if (template === aceTemplateNC) {
    files.push(path.join(projectPath, 'entry/src/main/cpp/CMakeLists.txt'));
    replaceInfos.push('appNameValue');
    strs.push(project);
  }
  replaceInfo(files, replaceInfos, strs);
  if (proType !== aceProType) {
    replaceAndroidProjectInfo(projectPath, bundleName, project, template);
    replaceiOSProjectInfo(projectPath, bundleName);
  }
  if (runtimeOS !== aceHarmonyOS && sdkVersion !== '10') {
    modifyOpenHarmonyOSConfig(projectPath, sdkVersion);
  }
  if (runtimeOS === aceHarmonyOS) {
    modifyHarmonyOSConfig(projectPath, 'entry', sdkVersion);
  }
}

function copyAndroidiOSTemplate(templatePath, projectPath, template, sdkVersion) {
  if (!copy(path.join(templatePath, '/android'), path.join(projectPath, '.arkui-x/android'))) {
    return false;
  }
  if (!copy(path.join(templatePath, '/ios'), path.join(projectPath, '.arkui-x/ios'))) {
    return false;
  }
  if (template === aceTemplateNC) {
    if (!copy(path.join(templatePath, '/cpp/cpp_android'), path.join(projectPath, '.arkui-x/android/app/src/main/cpp'))) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_ios'), path.join(projectPath, '.arkui-x/ios/app.xcodeproj'))) {
      return false;
    }
    if (sdkVersion !== '10') {
      let data = fs.readFileSync(path.join(projectPath, '.arkui-x/android/app/src/main/cpp/CMakeLists.txt'), 'utf8');
      data = data.replace(`$ENV{ARKUIX_SDK_HOME}/10`, `$ENV{ARKUIX_SDK_HOME}/${sdkVersion}`);
      fs.writeFileSync(path.join(projectPath, '.arkui-x/android/app/src/main/cpp/CMakeLists.txt'), data);
    }
  }

  fs.renameSync(path.join(projectPath, '.arkui-x/ios/app/AppDelegate_stage.m'),
    path.join(projectPath, '.arkui-x/ios/app/AppDelegate.m'));
  fs.renameSync(path.join(projectPath, '.arkui-x/ios/app/AppDelegate_stage.h'),
    path.join(projectPath, '.arkui-x/ios/app/AppDelegate.h'));
  return true;
}

function copyStageTemplate(templatePath, projectPath, proType, template, sdkVersion) {
  if (!copy(path.join(templatePath, '/ohos_stage'), projectPath)) {
    return false;
  }
  if (template === aceTemplateNC) {
    if (!copy(path.join(templatePath, '/cpp_ets_stage/source'), projectPath)) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_src'), path.join(projectPath, 'entry/src/main/cpp'))) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_ohos'), path.join(projectPath, 'entry/src/main/cpp'))) {
      return false;
    }
  } else {
    if (!copy(path.join(templatePath, '/ets_stage/source'), projectPath)) {
      return false;
    }
  }
  fs.mkdirSync(path.join(projectPath, '.arkui-x'), { recursive: true });
  fs.writeFileSync(path.join(projectPath, '.arkui-x/arkui-x-config.json5'), fs.readFileSync(path.join(templatePath, 'arkui-x-config.json5').toString()));
  if (proType !== aceProType) {
    if (!copyAndroidiOSTemplate(templatePath, projectPath, template, sdkVersion)) {
      return false;
    }
  }
  return true;
}

module.exports = create;
