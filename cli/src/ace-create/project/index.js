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
const JSON5 = require('json5');
const check = require('../../ace-check');
const aceVersionJs = '2';
const aceHarmonyOS = '2';

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
  const { project, packages, system, version, sdkVersion, moduletpye } = args;
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
        createProject(projectPath, packages, project, system, version, sdkVersion, moduletpye);
      } else {
        console.log('Failed to create project, project directory already exists.');
      }
    });
  } else {
    createProject(projectPath, packages, project, system, version, sdkVersion, moduletpye);
  }
}

function createProject(projectPath, packages, project, system, version, sdkVersion, moduletpye) {
  try {
    fs.mkdirSync(projectPath);
    if (moduletpye === '2') {
      findTemplate(projectPath, packages, project, system, version, sdkVersion);
    } else {
      findStageTemplate(projectPath, packages, project, system);
    }
    console.log('Project created successfully! Target directory：' + projectPath + ' .');
  } catch (error) {
    console.log('Project created failed! Target directory：' + projectPath + ' .' + error);
  }
}

function findStageTemplate(projectPath, packages, project, system) {
  let pathTemplate = path.join(__dirname, 'template');
  if (fs.existsSync(pathTemplate)) {
    copyStageTemplate(pathTemplate, projectPath);
    replaceStageProjectInfo(projectPath, packages, project, system);
  } else {
    pathTemplate = path.join(__dirname, '../../../templates');
    if (fs.existsSync(pathTemplate)) {
      copyStageTemplate(pathTemplate, projectPath);
      replaceStageProjectInfo(projectPath, packages, project, system);
    } else {
      console.log('Error: Template is not exist!');
    }
  }
}

function replaceStageProjectInfo(projectPath, packages, project, system) {
  if (!packages) {
    packages = 'com.example.arkuicross';
  }
  const packageArray = packages.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];
  fs.writeFileSync(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'),
    fs.readFileSync(path.join(projectPath,
      'android/app/src/main/java/MainActivity.java')).toString().replace(/setVersion\([^\)]*\);/g, ''));
  files.push(path.join(projectPath, 'ohos/AppScope/resources/base/element/string.json'));
  replaceInfos.push('projectName');
  strs.push(project);
  files.push(path.join(projectPath, 'ohos/AppScope/app.json5'));
  replaceInfos.push('appBunduleName');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/package.json'));
  replaceInfos.push('packageInfo');
  strs.push(project);
  files.push(path.join(projectPath, 'source/entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('MainAbility');
  files.push(path.join(projectPath, 'source/entry/src/main/resources/en_US/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('MainAbility');
  files.push(path.join(projectPath, 'source/entry/src/main/resources/zh_CN/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('MainAbility');
  files.push(path.join(projectPath, 'source/entry/src/main/module.json5'));
  replaceInfos.push('module_ability_name');
  strs.push('MainAbility');
  files.push(path.join(projectPath, 'source/entry/src/main/module.json5'));
  replaceInfos.push('module_name');
  strs.push('entry');
  files.push(path.join(projectPath, 'source/entry/src/ohosTest/module.json5'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test');
  files.push(path.join(projectPath, 'source/entry/src/ohosTest/resources/base/element/string.json'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test_desc');
  files.push(path.join(projectPath, 'source/entry/package.json'));
  replaceInfos.push('module_name');
  strs.push('entry');

  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appIDValueHi');
  strs.push(packages);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appNameValueHi');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/res/values/strings.xml'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('packageName');
  strs.push(packages);
  files.push(path.join(projectPath, 'android/app/build.gradle'));
  replaceInfos.push('packageName');
  strs.push(packages);
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);

  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push(packages + ':entry:MainAbility:');
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ohos.ace.adapter.AceActivity');
  strs.push('ohos.stage.ability.adapter.StageActivity');
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('AceActivity');
  strs.push('StageActivity');
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('MainActivity');
  strs.push('EntryMainActivity');
  files.push(path.join(projectPath, 'android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('ohos.ace.adapter.AceApplication');
  strs.push('ohos.stage.ability.adapter.StageApplication');
  files.push(path.join(projectPath, 'android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('AceApplication');
  strs.push('StageApplication');
  files.push(path.join(projectPath, 'android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('MainActivity');
  strs.push('EntryMainActivity');

  files.push(path.join(projectPath, 'ios/app.xcodeproj/project.pbxproj'));
  replaceInfos.push('bundleIdentifier');
  strs.push(packages);
  files.push(path.join(projectPath, 'ios/app/AppDelegate.mm'));
  replaceInfos.push('ACE_VERSION');
  strs.push('ACE_VERSION_ETS');

  replaceInfo(files, replaceInfos, strs);
  fs.renameSync(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'), path.join(projectPath,
    'android/app/src/main/java/EntryMainActivity.java'));
  if (system == aceHarmonyOS) {
    modifyHarmonyOSConfig(projectPath, 'entry', 'stage');
  }
  const aospJavaPath = path.join(projectPath, 'android/app/src/main/java');
  const testAospJavaPath = path.join(projectPath, 'android/app/src/test/java');
  const androidTestAospJavaPath = path.join(projectPath, 'android/app/src/androidTest/java');
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function copyStageTemplate(templatePath, projectPath) {
  if (!copy(path.join(templatePath, '/ets_stage/source'), path.join(projectPath, '/source'))) {
    return false;
  }
  if (!copy(path.join(templatePath, '/ohos_stage'), path.join(projectPath, '/ohos'))) {
    return false;
  }
  if (!copy(path.join(templatePath, '/android'), path.join(projectPath, '/android'))) {
    return false;
  }
  if (!copy(path.join(templatePath, '/ios'), path.join(projectPath, '/ios'))) {
    return false;
  }
  fs.renameSync(path.join(projectPath, '/ios/etsapp.xcodeproj'), path.join(projectPath, '/ios/app.xcodeproj'));
  fs.renameSync(path.join(projectPath, '/ios/etsapp'), path.join(projectPath, '/ios/app'));
  fs.renameSync(path.join(projectPath, '/ios/js'), path.join(projectPath, '/ios/arkui-x'));
  return true;
}

function findTemplate(projectPath, packages, project, system, version, sdkVersion) {
  let pathTemplate = path.join(__dirname, 'template');
  if (fs.existsSync(pathTemplate)) {
    copyTemplateToProject(pathTemplate, projectPath, version);
    replaceProjectInfo(projectPath, packages, project, system, version, sdkVersion);
  } else {
    pathTemplate = path.join(__dirname, '../../../templates');
    if (fs.existsSync(pathTemplate)) {
      copyTemplateToProject(pathTemplate, projectPath, version);
      replaceProjectInfo(projectPath, packages, project, system, version, sdkVersion);
    } else {
      console.log('Error: Template is not exist!');
    }
  }
}

function replaceProjectInfo(projectPath, packages, project, system, version, sdkVersion) {
  if (!packages) {
    packages = 'com.example.arkuicross';
  }
  let jsName = 'ets';
  if (version == aceVersionJs) {
    jsName = 'js';
  }
  const packageArray = packages.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];
  let aceVersion;
  let srcLanguage;

  files.push(path.join(projectPath, 'source/entry/src/main/' + jsName + '/MainAbility/manifest.json'));
  replaceInfos.push('appIDValue');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/package.json'));
  replaceInfos.push('jsapp');
  strs.push(project);
  files.push(path.join(projectPath, 'source/entry/src/main/' + jsName + '/MainAbility/manifest.json'));
  replaceInfos.push('appNameValue');
  strs.push(project);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appIDValueHi');
  strs.push(packages);
  files.push(path.join(projectPath, 'android/settings.gradle'));
  replaceInfos.push('appNameValueHi');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/res/values/strings.xml'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('packageName');
  strs.push(packages);
  files.push(path.join(projectPath, 'android/app/build.gradle'));
  replaceInfos.push('packageName');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('packageInfo');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('bundleNameValue');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('appNameValue');
  strs.push(project);
  files.push(path.join(projectPath, 'source/entry/src/ohosTest/config.json'));
  replaceInfos.push('bundleNameValue');
  strs.push(packages);
  files.push(path.join(projectPath, 'ohos/entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + packages);
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push('entry_MainAbility');
  files.push(path.join(projectPath, 'ohos/build-profile.json5'));
  replaceInfos.push('appSdkVersion');
  strs.push(sdkVersion);
  files.push(path.join(projectPath, 'source/entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('appName');
  strs.push(project);

  if (jsName === 'ets') {
    aceVersion = 'VERSION_ETS';
    srcLanguage = 'ets';
    files.push(path.join(projectPath, 'ios/etsapp.xcodeproj/project.pbxproj'));
    replaceInfos.push('bundleIdentifier');
    strs.push(packages);
    files.push(path.join(projectPath, 'ios/etsapp/AppDelegate.mm'));
    replaceInfos.push('ACE_VERSION');
    strs.push('ACE_VERSION_ETS');
  } else {
    aceVersion = 'VERSION_JS';
    srcLanguage = 'js';
    files.push(path.join(projectPath, 'ios/jsapp.xcodeproj/project.pbxproj'));
    replaceInfos.push('bundleIdentifier');
    strs.push(packages);
    files.push(path.join(projectPath, 'ios/jsapp.xcodeproj/project.pbxproj'));
    replaceInfos.push('etsapp');
    strs.push('jsapp');
    files.push(path.join(projectPath, 'ios/jsapp/AppDelegate.mm'));
    replaceInfos.push('ACE_VERSION');
    strs.push('ACE_VERSION_JS');
  }
  files.push(path.join(projectPath, 'android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ACE_VERSION');
  strs.push(aceVersion);
  files.push(path.join(projectPath, 'ohos/entry/src/main/config.json'));
  replaceInfos.push('srcLanguageValue');
  strs.push(srcLanguage);
  replaceInfo(files, replaceInfos, strs);

  if (system == aceHarmonyOS) {
    modifyHarmonyOSConfig(projectPath, 'entry');
  }
  if (jsName === 'js') {
    const configJsonPath = path.join(projectPath, 'ohos/entry/src/main/config.json');
    const configJsonObj = JSON.parse(fs.readFileSync(configJsonPath));
    delete configJsonObj.module.js[0]['mode'];
    fs.writeFileSync(configJsonPath, JSON.stringify(configJsonObj, '', '  '));
  }

  const aospJavaPath = path.join(projectPath, 'android/app/src/main/java');
  const testAospJavaPath = path.join(projectPath, 'android/app/src/test/java');
  const androidTestAospJavaPath = path.join(projectPath, 'android/app/src/androidTest/java');
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function createPackageFile(packagePaths, packageArray) {
  packagePaths.forEach(packagePath => {
    const files = fs.readdirSync(packagePath);
    const oldPath = packagePath;
    packageArray.forEach(packageInfo => {
      fs.mkdirSync(path.join(packagePath, packageInfo));
      packagePath = path.join(packagePath, packageInfo);
    });
    files.forEach(javaFile => {
      const srcEle = path.join(oldPath, javaFile);
      const dstEle = path.join(packagePath, javaFile);
      if (fs.statSync(srcEle).isFile()) {
        fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
        fs.unlinkSync(srcEle);
      } else {
        fs.mkdirSync(dstEle);
        copy(srcEle, dstEle);
        rmdir(srcEle);
      }
    });
  });
}
function replaceInfo(files, replaceInfos, strs) {
  files.forEach((filePath, index) => {
    fs.writeFileSync(filePath,
      fs.readFileSync(filePath).toString().replace(new RegExp(replaceInfos[index], 'g'), strs[index]));
  });
}

function rmdir(filePath) {
  if (fs.statSync(filePath).isFile()) {
    fs.unlinkSync(filePath);
  } else {
    fs.readdirSync(filePath).forEach(file => {
      const currentPath = path.join(filePath, file);
      if (fs.statSync(currentPath).isFile()) {
        fs.unlinkSync(currentPath);
      } else {
        rmdir(currentPath);
      }
    });
    fs.rmdirSync(filePath);
  }
}

function copy(src, dst) {
  const paths = fs.readdirSync(src).filter(item => {
    return item.substring(0, 1) != '.';
  });
  paths.forEach(newpath => {
    const srcEle = path.join(src, newpath);
    const dstEle = path.join(dst, newpath);
    if (fs.statSync(srcEle).isFile()) {
      const parentDir = path.parse(dstEle).dir;
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(dstEle, fs.readFileSync(srcEle));
    } else {
      if (!fs.existsSync(dstEle)) {
        fs.mkdirSync(dstEle, { recursive: true });
      }
      copy(srcEle, dstEle);
    }
  });
  return true;
}

function copySourceTemplate(templatePath, projectPath, version) {
  let sourcePath;
  if (version == aceVersionJs) {
    sourcePath = path.join(templatePath, '/js_fa/source');
  } else {
    sourcePath = path.join(templatePath, '/ets_fa/source');
  }
  return copy(sourcePath, path.join(projectPath, '/source'));
}

function copyIosTemplate(templatePath, projectPath, version) {
  copy(path.join(templatePath, '/ios'), path.join(projectPath, '/ios'));
  if (version == aceVersionJs) {
    fs.renameSync(path.join(projectPath, '/ios/etsapp.xcodeproj'), path.join(projectPath, '/ios/jsapp.xcodeproj'));
    fs.renameSync(path.join(projectPath, '/ios/etsapp'), path.join(projectPath, '/ios/jsapp'));
  }
  return true;
}

function copyTemplateToProject(templatePath, projectPath, version) {
  if (!copySourceTemplate(templatePath, projectPath, version)) {
    return false;
  }
  if (!copy(path.join(templatePath, '/ohos_fa'), path.join(projectPath, '/ohos'))) {
    return false;
  }
  if (!copy(path.join(templatePath, '/android'), path.join(projectPath, '/android'))) {
    return false;
  }
  if (!copyIosTemplate(templatePath, projectPath, version)) {
    return false;
  }
  return true;
}

function modifyHarmonyOSConfig(projectPath, moduleName, moduletpye) {
  let buildProfile;
  let configFile;
  let deviceTypeName;
  if (moduletpye === 'stage') {
    buildProfile = path.join(projectPath, 'source', moduleName, '/build-profile.json5');
    configFile = [path.join(projectPath, 'source', moduleName, 'src/main/module.json5'),
      path.join(projectPath, 'source', moduleName, 'src/ohosTest/module.json5')];
    deviceTypeName = 'deviceTypes';
  } else {
    buildProfile = path.join(projectPath, 'ohos', moduleName, '/build-profile.json5');
    configFile = [path.join(projectPath, 'ohos', moduleName, 'src/main/config.json'),
      path.join(projectPath, 'source', moduleName, 'src/ohosTest/config.json')];
    deviceTypeName = 'deviceType';
  }

  if (fs.existsSync(buildProfile)) {
    const buildProfileInfo = JSON5.parse(fs.readFileSync(buildProfile));
    for (let index = 0; index < buildProfileInfo.targets.length; index++) {
      if (buildProfileInfo.targets[index].name === 'default') {
        buildProfileInfo.targets[index].runtimeOS = HarmonyOS;
        break;
      }
    }
    fs.writeFileSync(buildProfile, JSON.stringify(buildProfileInfo, '', '  '));
  }

  configFile.forEach(config => {
    if (fs.existsSync(config)) {
      const configFileInfo = JSON.parse(fs.readFileSync(config));
      configFileInfo.module[deviceTypeName] = ['phone'];
      fs.writeFileSync(config, JSON.stringify(configFileInfo, '', '  '));
    }
  });
}

module.exports = {
  create,
  copy,
  modifyHarmonyOSConfig
};
