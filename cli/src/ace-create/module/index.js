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
const { copy, modifyHarmonyOSConfig } = require('../util');
const { getModuleList, getCurrentProjectSystem, isNativeCppTemplate, addFileToPbxproj,
  isAppProject } = require('../../util');

let projectDir;
let currentSystem;


function capitalize(str) {
  if (/^[A-Z]/.test(str)) {
    return str;
  } else {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

function isModuleNameQualified(name) {
  const regEn = /[`~!@#$%^&*()+<>?:"{},.\/;'\\[\]]/im;
  const regCn = /[·！#￥（——）：；“”‘、，|《。》？、【】[\]]/im;

  if (regEn.test(name) || regCn.test(name) || !isNaN(name[0]) || name.length > 31) {
    return false;
  } else if (name[0] === '_') {
    return false;
  }
  return true;
}

function checkModuleName(moduleList, moduleName) {
  if (!moduleName) {
    console.error('Module name must be required!');
    return false;
  }
  const sensitiveWords = ['ohos', 'android', 'ios'];
  if (sensitiveWords.includes(moduleName)) {
    console.error('Module name is invalid');
    return false;
  }
  if (!moduleName.match(/^\w+$/)) {
    console.error('The Module name can contain only letters, digits, and underscores(_).');
    return false;
  }
  if (/^\d/.test(moduleName)) {
    console.error('The Module name can contain only letters, digits, and underscores(_).');
    return false;
  }
  if (fs.existsSync(path.join(projectDir, moduleName)) ||
    fs.existsSync(path.join(projectDir, moduleName))) {
    console.error(`\n${moduleName} already exists.`);
    return false;
  }
  for (let index = 0; index < moduleList.length; index++) {
    if (moduleList[index] === moduleName) {
      console.error(`${moduleName} already exists.`);
      return false;
    }
  }
  return true;
}

function createStageInAndroid(moduleName, templateDir) {
  if (!isAppProject(projectDir)) {
    console.warn('aar and framework not support multiple modules.');
    return true;
  }
  const packageName = getPackageName();
  const packageArray = packageName.split('.');
  const src = path.join(templateDir, 'android/app/src/main/java');
  try {
    const templateFileName = 'MainActivity.java';
    const destClassName = moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + 'EntryAbilityActivity';
    let dest = path.join(projectDir, '.arkui-x/android/app/src/main/java');
    packageArray.forEach(pkg => {
      dest = path.join(dest, pkg);
    });
    const srcFile = path.join(src, templateFileName);
    const destFileName = destClassName + '.java';
    const destFilePath = path.join(dest, destFileName);
    fs.writeFileSync(destFilePath, fs.readFileSync(srcFile));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('MainActivity', 'g'), destClassName));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('packageName', 'g'), packageName));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ohos.ace.adapter.AceActivity', 'g'),
        'ohos.stage.ability.adapter.StageActivity'));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('AceActivity', 'g'), 'StageActivity'));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ArkUIInstanceName', 'g'), packageName + ':'
      + moduleName + ':EntryAbility:'));
    const createActivityXmlInfo =
      '    <activity \n' +
      '            android:name=".' + destClassName + '"\n' +
      '        android:exported="true" android:configChanges="uiMode|orientation|screenSize|density" />\n    ';
    const curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, '.arkui-x/android/app/src/main/AndroidManifest.xml')).toString();
    const insertIndex = curManifestXmlInfo.lastIndexOf('</application>');
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertIndex) +
      createActivityXmlInfo +
      curManifestXmlInfo.slice(insertIndex);
    fs.writeFileSync(path.join(projectDir, '.arkui-x/android/app/src/main/AndroidManifest.xml'), updateManifestXmlInfo);

    return true;
  } catch (error) {
    console.error('Error occurs when create in android', error);
    return false;
  }
}

function getPackageName() {
  try {
    const manifestPath = path.join(projectDir, 'AppScope/app.json5');
    const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
    return manifestJsonObj.app.bundleName;
  } catch (error) {
    console.error('Get package name error.');
    return '';
  }
}

function getAppNameForModule() {
  try {
    const manifestPath = path.join(projectDir, 'oh-package.json5');
    const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
    return manifestJsonObj.name;
  } catch (error) {
    console.error('Get app name error.');
    return '';
  }
}

function createStageModuleInSource(moduleName, templateDir) {
  const dest = path.join(projectDir,  moduleName);
  let src = path.join(templateDir, 'ets_stage/source/entry');
  try {
    fs.mkdirSync(dest, { recursive: true });
    if (isNativeCppTemplate(projectDir)) {
      src = path.join(templateDir, 'cpp_ets_stage/source/entry');
      return copyNativeToModule(moduleName, templateDir) && copy(src, dest);
    }
    return copy(src, dest);
  } catch (error) {
    console.error('Error occurs when create in source.');
    return false;
  }
}

function replaceStageProfile(moduleName) {
  try {
    if (moduleName != 'entry') {
      const srcModulePath = path.join(projectDir, moduleName, 'src/main/module.json5');
      const modulePathJson = JSON.parse(fs.readFileSync(srcModulePath).toString());
      delete modulePathJson.module.abilities[0].skills;
      fs.writeFileSync(srcModulePath, JSON.stringify(modulePathJson, '', '  '));
      modifyModuleBuildProfile(projectDir, moduleName);
      if (isNativeCppTemplate(projectDir)) {
        const appName = getAppNameForModule();
        if (appName == '') {
          return false;
        }
        replaceNativeCppTemplate(moduleName, appName);
      }
    }
    const srcBuildPath = path.join(projectDir, 'build-profile.json5');
    const buildPathJson = JSON.parse(fs.readFileSync(srcBuildPath).toString());
    const moduleInfo = {
      'name': moduleName,
      'srcPath': './' + moduleName,
      'targets': [
        {
          'name': 'default',
          'applyToProducts': [
            'default'
          ]
        }
      ]
    };
    buildPathJson.modules.push(moduleInfo);
    fs.writeFileSync(srcBuildPath, JSON.stringify(buildPathJson, '', '  '));
    return true;
  } catch (error) {
    console.error('Replace stage project info error.');
    return false;
  }
}

function replaceStageProjectInfo(moduleName) {
  try {
    const files = [];
    const replaceInfos = [];
    const strs = [];
    files.push(path.join(projectDir, moduleName, '/src/main/resources/base/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, moduleName, '/src/main/resources/en_US/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, moduleName, '/src/main/resources/zh_CN/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    if (moduleName != 'entry') {
      files.push(path.join(projectDir, moduleName, '/src/main/module.json5'));
      replaceInfos.push(`"entry"`);
      strs.push(`"feature"`);
    }
    files.push(path.join(projectDir, moduleName, '/src/main/module.json5'));
    replaceInfos.push('module_path_name');
    strs.push(moduleName.toLowerCase());
    files.push(path.join(projectDir, moduleName, '/src/main/module.json5'));
    replaceInfos.push('module_name');
    strs.push(moduleName);
    files.push(path.join(projectDir, moduleName, '/src/main/module.json5'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, moduleName, '/src/ohosTest/module.json5'));
    replaceInfos.push('module_test_name');
    strs.push(moduleName + '_test');
    files.push(path.join(projectDir, moduleName, '/oh-package.json5'));
    replaceInfos.push('module_name');
    strs.push(moduleName);
    files.forEach((filePath, index) => {
      fs.writeFileSync(filePath,
        fs.readFileSync(filePath).toString().replace(new RegExp(replaceInfos[index], 'g'), strs[index]));
    });
    if (!replaceStageProfile(moduleName)) {
      console.error('Please check stage project.');
      return false;
    }
    if (currentSystem === HarmonyOS) {
      modifyHarmonyOSConfig(projectDir, moduleName);
    }
    return true;
  } catch (error) {
    console.error('Replace project info error.');
    return false;
  }
}

function createStageInIOS(moduleName, templateDir) {
  if (!isAppProject(projectDir)) {
    return true;
  }
  try {
    const destClassName = moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + 'MainViewController';
    const srcFilePath = path.join(templateDir, 'ios/etsapp/EntryMainViewController');
    fs.writeFileSync(path.join(projectDir, '.arkui-x/ios/app/' + destClassName + '.h'),
      fs.readFileSync(srcFilePath + '.h').toString().replace(new RegExp('EntryMainViewController', 'g'),
        destClassName));
    fs.writeFileSync(path.join(projectDir, '.arkui-x/ios/app/' + destClassName + '.m'),
      fs.readFileSync(srcFilePath + '.m').toString().replace(new RegExp('EntryMainViewController', 'g'),
        destClassName));
    const createViewControlInfo =
      '} else if ([moduleName isEqualToString:@"' + moduleName + '"] && [abilityName '+
      '  isEqualToString:@"EntryAbility"]) {\n' +
      '        NSString *instanceName = [NSString stringWithFormat:@"%@:%@:%@",'+
      'bundleName, moduleName, abilityName];\n' +
      '        ' + destClassName + ' *entryOtherVC = [[' + destClassName + ' alloc] '+
      'initWithInstanceName:instanceName];\n' +
      '        entryOtherVC.params = params;\n' +
      '        subStageVC = (' + destClassName + ' *)entryOtherVC;\n' +
      '    } // other ViewController\n';
    const curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, '.arkui-x/ios/app/AppDelegate.m')).toString();
    const insertIndex = curManifestXmlInfo.lastIndexOf('} // other ViewController');
    const insertImportIndex = curManifestXmlInfo.lastIndexOf('#import "EntryMainViewController.h"');
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertImportIndex) +
    '#import "' + destClassName + '.h"\n' +
    curManifestXmlInfo.slice(insertImportIndex, insertIndex) +
    createViewControlInfo +
      curManifestXmlInfo.slice(insertIndex + 26);
    fs.writeFileSync(path.join(projectDir, '.arkui-x/ios/app/AppDelegate.m'), updateManifestXmlInfo);
    const pbxprojFilePath = path.join(projectDir, '.arkui-x/ios/app.xcodeproj/project.pbxproj');
    if (!addFileToPbxproj(pbxprojFilePath, destClassName + '.h', 'headfile') ||
      !addFileToPbxproj(pbxprojFilePath, destClassName + '.m', 'sourcefile')) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error occurs when create in ios', error);
    return false;
  }
}

function createStageModule(moduleList, templateDir) {
  if (moduleList.length == 0) {
    if (createStageModuleInSource('entry', templateDir) &&
      createStageInAndroid('entry', templateDir)) {
      return replaceStageProjectInfo('entry');
    }
  } else {
    const question = [{
      name: 'moduleName',
      type: 'input',
      message: 'Please enter the module name:',
      validate(val) {
        if (!isModuleNameQualified(val)) {
          console.log('Module name must contain 1 to 31 characters, start with a letter, ' +
            'and include only letters, digits and underscores (_).');
          return false;
        }
        return checkModuleName(moduleList, val);
      }
    }];
    inquirer.prompt(question).then(answers => {
      if (createStageModuleInSource(answers.moduleName, templateDir)
        && createStageInAndroid(answers.moduleName, templateDir)
        && createStageInIOS(answers.moduleName, templateDir)) {
        return replaceStageProjectInfo(answers.moduleName);
      }
    });
  }
}

function modifyModuleBuildProfile(projectDir, moduleName) {
  const moduleBuildProfile = path.join(projectDir, moduleName, '/build-profile.json5');
  if (moduleName != 'entry' && fs.existsSync(moduleBuildProfile)) {
    const moduleBuildProfileInfo = JSON5.parse(fs.readFileSync(moduleBuildProfile));
    moduleBuildProfileInfo.entryModules = ['entry'];
    fs.writeFileSync(moduleBuildProfile, JSON.stringify(moduleBuildProfileInfo, '', '  '));
  }
}

function copyNativeToModule(moduleName, templateDir) {
  if (!copy(path.join(templateDir, '/cpp/cpp_src'), path.join(projectDir, `/${moduleName}/src/main/cpp`))) {
    return false;
  }
  if (!copy(path.join(templateDir, '/cpp/cpp_ohos'), path.join(projectDir, `/${moduleName}/src/main/cpp`))) {
    return false;
  }
  return true;
}

function replaceNativeCppTemplate(moduleName, appName) {
  try {
    const baseModulePath = path.join(projectDir, moduleName);
    const packageJsonPath = path.join(baseModulePath, 'oh-package.json5');
    const moduleToLower = moduleName.toLowerCase();
    const cMakeFile = path.join(baseModulePath, `src/main/cpp/CMakeLists.txt`);
    const cPackageFile = path.join(baseModulePath, 'src/main/cpp/types/libentry/oh-package.json5');
    const oldPath = path.join(baseModulePath, 'src/main/cpp/types/libentry');
    const newPath = path.join(baseModulePath, `src/main/cpp/types/lib${moduleToLower}`);
    const helloPath = path.join(baseModulePath, 'src/main/cpp/hello.cpp');
    replaceFileString(path.join(baseModulePath, 'src/main/ets/pages/Index.ets'), /entry/g, moduleToLower);
    replaceFileString(packageJsonPath, /entry/g, moduleToLower);
    replaceFileString(cMakeFile, /entry/g, moduleToLower);
    replaceFileString(cMakeFile, 'appNameValue', appName);
    replaceFileString(cPackageFile, /entry/g, moduleToLower);
    replaceFileString(helloPath, /entry/g, moduleName);
    replaceFileString(helloPath, /Entry/g, capitalize(moduleName));
    fs.renameSync(oldPath, newPath);

    return true;
  } catch {
    console.error('Replace Native C++ template failed.');
    return false;
  }
}

function replaceFileString(file, oldString, newString) {
  fs.writeFileSync(file, fs.readFileSync(file).toString().replace(oldString, newString));
}


function createModule() {
  projectDir = process.cwd();
  if (!fs.existsSync(path.join(projectDir, 'hvigorw'))) {
    console.error(`Please go to project directory under ace project path and create module again.`);
    return false;
  }

  currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  const settingPath = path.join(projectDir, 'build-profile.json5');
  const moduleList = getModuleList(settingPath);
  if (moduleList == null) {
    console.error('Create module failed');
    return false;
  }
  let templateDir = path.join(__dirname, 'template');
  if (!fs.existsSync(templateDir)) {
    templateDir = path.join(__dirname, '../../../templates');
  }
  return createStageModule(moduleList, templateDir);
}

module.exports = createModule;
