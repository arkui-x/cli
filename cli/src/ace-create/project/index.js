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
const readline = require('readline');
const path = require('path');
const inquirer = require('inquirer');
const check = require('../../ace-check');

const createAar = require('../aar');
const createFramework = require('../framework');
const { copy, rmdir, createPackageFile, replaceInfo, modifyHarmonyOSConfig,
  modifyNativeCppConfig } = require('../util');
const aceHarmonyOS = '2';
const aceTemplateNC = '2';
const aceProType = '2';

function create(args) {
  check();
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
  const { project, packages, system, proType, template, sdkVersion } = args;
  const projectPath = path.join(process.cwd(), project);
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
        createProject(projectPath, packages, project, system, proType, template, sdkVersion);
      } else {
        console.log('Failed to create project, project directory already exists.');
      }
    });
  } else {
    createProject(projectPath, packages, project, system, proType, template, sdkVersion);
  }
}

function createProject(projectPath, packages, project, system, proType, template, sdkVersion) {
  try {
    fs.mkdirSync(projectPath);
    findStageTemplate(projectPath, packages, project, system, proType, template, sdkVersion);
    if (proType === aceProType) {
      if (!(createAar(projectPath, project) && createFramework(projectPath, project))) {
        return false;
      }
    }
    console.log('Project created successfully! Target directory：' + projectPath + ' .');
  } catch (error) {
    console.log('Project created failed! Target directory：' + projectPath + ' .' + error);
  }
}

function findStageTemplate(projectPath, packages, project, system, proType, template, sdkVersion) {

  let pathTemplate = path.join(__dirname, 'template');
  if (fs.existsSync(pathTemplate)) {
    copyStageTemplate(pathTemplate, projectPath, proType, template);
    replaceStageProjectInfo(projectPath, packages, project, system, proType, template, sdkVersion);
  } else {
    pathTemplate = path.join(__dirname, '../../../templates');
    if (fs.existsSync(pathTemplate)) {
      copyStageTemplate(pathTemplate, projectPath, proType, template);
      replaceStageProjectInfo(projectPath, packages, project, system, proType, template, sdkVersion);
    } else {
      console.log('Error: Template is not exist!');
    }
  }
}

function replaceAndroidProjectInfo(projectPath, packages, project, system, template, sdkVersion) {
  const packageArray = packages.split('.');
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
  strs.push(packages);
  files.push(path.join(projectPath, '.arkui-x/android/app/build.gradle'));
  replaceInfos.push('packageName');
  strs.push(packages);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push(packages + ':entry:EntryAbility:');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ohos.ace.adapter.AceActivity');
  strs.push('ohos.stage.ability.adapter.StageActivity');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('AceActivity');
  strs.push('StageActivity');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('ohos.ace.adapter.AceApplication');
  strs.push('ohos.stage.ability.adapter.StageApplication');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('AceApplication');
  strs.push('StageApplication');
  files.push(path.join(projectPath, '.arkui-x/android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  if (template == aceTemplateNC) {
    modifyNativeCppConfig(projectPath, files, replaceInfos, strs, project, system, sdkVersion);
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

function replaceiOSProjectInfo(projectPath, packages) {
  const files = [];
  const replaceInfos = [];
  const strs = [];
  files.push(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj'));
  replaceInfos.push('bundleIdentifier');
  strs.push(packages);
  files.push(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj'));
  replaceInfos.push('etsapp');
  strs.push('app');
  files.push(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj'));
  replaceInfos.push('res');
  strs.push('arkui-x');
  files.push(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj'));
  replaceInfos.push('DFFB5DAC28F4429C00E74486');
  strs.push('DFC5555529D7F36400B63EB3');
  files.push(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj'));
  replaceInfos.push('AppDelegate.mm');
  strs.push('AppDelegate.m');
  files.push(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj'));
  replaceInfos.push('DFFB5DAD28F4429C00E74486');
  strs.push('DFC5555629D7F36400B63EB3');
  files.push(path.join(projectPath, '.arkui-x/ios/app/AppDelegate.m'));
  replaceInfos.push('packageName');
  strs.push(packages);
  replaceInfo(files, replaceInfos, strs);
  replaceIOSRbxprojInfo(projectPath);
}

function replaceStageProjectInfo(projectPath, packages, project, system, proType, template, sdkVersion) {
  if (!packages) {
    packages = 'com.example.arkuicross';
  }
  const files = [];
  const replaceInfos = [];
  const strs = [];

  files.push(path.join(projectPath, 'AppScope/resources/base/element/string.json'));
  replaceInfos.push('projectName');
  strs.push(project);
  files.push(path.join(projectPath, 'AppScope/app.json5'));
  replaceInfos.push('appBunduleName');
  strs.push(packages);
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
  if (template == aceTemplateNC) {
    files.push(path.join(projectPath, 'entry/src/main/cpp/CMakeLists.txt'));
    replaceInfos.push('appNameValue');
    strs.push(project);
  }
  replaceInfo(files, replaceInfos, strs);
  if (proType !== aceProType) {
    replaceAndroidProjectInfo(projectPath, packages, project, system, template, sdkVersion);
    replaceiOSProjectInfo(projectPath, packages);
  }
  if (system == aceHarmonyOS) {
    modifyHarmonyOSConfig(projectPath, 'entry');
  }
}

function copyAndroidiOSTemplate(templatePath, projectPath, template) {
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
    if (!copy(path.join(templatePath, '/cpp/cpp_ios'), path.join(projectPath, '.arkui-x/ios/etsapp.xcodeproj'))) {
      return false;
    }
  }

  fs.renameSync(path.join(projectPath, '.arkui-x/ios/etsapp.xcodeproj'), path.join(projectPath, '.arkui-x/ios/app.xcodeproj'));
  fs.renameSync(path.join(projectPath, '.arkui-x/ios/etsapp'), path.join(projectPath, '.arkui-x/ios/app'));
  fs.renameSync(path.join(projectPath, '.arkui-x/ios/js'), path.join(projectPath, '.arkui-x/ios/arkui-x'));
  fs.unlinkSync(path.join(projectPath, '.arkui-x/ios/app/AppDelegate.mm'));
  fs.unlinkSync(path.join(projectPath, '.arkui-x/ios/app/AppDelegate.h'));
  fs.renameSync(path.join(projectPath, '.arkui-x/ios/app/AppDelegate_stage.m'),
    path.join(projectPath, '.arkui-x/ios/app/AppDelegate.m'));
  fs.renameSync(path.join(projectPath, '.arkui-x/ios/app/AppDelegate_stage.h'),
    path.join(projectPath, '.arkui-x/ios/app/AppDelegate.h'));
  return true;
}

function copyStageTemplate(templatePath, projectPath, proType, template) {
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
  if (proType !== aceProType) {
    if (!copyAndroidiOSTemplate(templatePath, projectPath, template)){
      return false;
    }
  }
  return true;
}

function replaceIOSRbxprojInfo(projectPath) {
  const rbxprojInfoPath = path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj');
  const rl = readline.createInterface({
    input: fs.createReadStream(rbxprojInfoPath)
  });

  const fileStream = fs.createWriteStream(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj.temp'),
    { autoClose: true });

  rl.on('line', function(line) {
    if (!line.includes('DF9C1B6128B9FC4B005DCF58') && !line.includes('DF9C1B6028B9FC4B005DCF58')) {
      fileStream.write(line + '\n');
    }
  });
  rl.on('close', function() {
    fileStream.end(function() {
      fs.fsyncSync(fileStream.fd);
      fs.unlinkSync(rbxprojInfoPath);
      fs.renameSync(path.join(projectPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj.temp'), rbxprojInfoPath);
    });
  });
}

module.exports = create;
