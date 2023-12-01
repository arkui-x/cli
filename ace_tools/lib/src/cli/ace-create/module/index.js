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
const { copy, modifyHarmonyOSConfig, addCrosssPlatform, modifyOpenHarmonyOSConfig } = require('../util');
const { getSdkVersion } = require('../../util');
const { createStageAbilityInAndroid, createStageAbilityInIOS } = require('../ability')
const { getModuleList, getCurrentProjectSystem, isNativeCppTemplate, addFileToPbxproj,
  isAppProject } = require('../../util');

const projectDir = process.cwd();
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
  if (fs.existsSync(path.join(projectDir, moduleName))) {
    console.error(`\n${moduleName} already exists.`);
    return false;
  }
  for (let index = 0; index < moduleList.length; index++) {
    if (moduleList[index].toLowerCase() === moduleName.toLowerCase()) {
      console.error(`\n${moduleName} already exists.`);
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
    }) + capitalize(moduleName) + 'AbilityActivity';
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
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ArkUIInstanceName', 'g'), packageName + ':'
      + moduleName + ':' + capitalize(moduleName) + 'Ability:'));
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
    if (isNativeCppTemplate(projectDir)) {
      replaceAndroidNativeCpp(moduleName);
    }
    return true;
  } catch (error) {
    console.error('Error occurs when create in android', error);
    return false;
  }
}

function getPackageName() {
  try {
    const manifestPath = path.join(projectDir, 'AppScope/app.json5');
    const manifestJsonObj = JSON5.parse(fs.readFileSync(manifestPath));
    return manifestJsonObj.app.bundleName;
  } catch (error) {
    console.error('Get package name error.');
    return '';
  }
}

function getAppNameForModule() {
  try {
    const manifestPath = path.join(projectDir, 'oh-package.json5');
    const manifestJsonObj = JSON5.parse(fs.readFileSync(manifestPath));
    return manifestJsonObj.name;
  } catch (error) {
    console.error('Get app name error.');
    return '';
  }
}

function createStageModuleInSource(moduleName, templateDir) {
  const dest = path.join(projectDir, moduleName);
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
    if (moduleName !== 'entry') {
      const srcModulePath = path.join(projectDir, moduleName, 'src/main/module.json5');
      const modulePathJson = JSON5.parse(fs.readFileSync(srcModulePath).toString());
      delete modulePathJson.module.abilities[0].skills;
      fs.writeFileSync(srcModulePath, JSON5.stringify(modulePathJson, '', '  '));
      modifyModuleBuildProfile(projectDir, moduleName);
      if (isNativeCppTemplate(projectDir)) {
        const appName = getAppNameForModule();
        if (appName === '') {
          return false;
        }
        replaceNativeCppTemplate(moduleName, appName);
      }
    }
    const srcBuildPath = path.join(projectDir, 'build-profile.json5');
    const buildPathJson = JSON5.parse(fs.readFileSync(srcBuildPath).toString());
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
    fs.writeFileSync(srcBuildPath, JSON5.stringify(buildPathJson, '', '  '));
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

    const mainPath = path.join(projectDir, moduleName, 'src', 'main');
    const targetAbilityDir = path.join(mainPath, 'ets', moduleName + 'ability');
    fs.renameSync(path.join(mainPath, 'ets', 'entryability'), targetAbilityDir);
    fs.renameSync(path.join(targetAbilityDir, 'EntryAbility.ets'), path.join(targetAbilityDir, capitalize(moduleName) + 'Ability.ets'));

    files.push(path.join(targetAbilityDir, capitalize(moduleName) + 'Ability.ets'));
    replaceInfos.push('EntryAbility');
    strs.push(capitalize(moduleName) + 'Ability');

    files.push(path.join(projectDir, moduleName, '/src/main/module.json5'));
    replaceInfos.push('EntryAbility');
    strs.push(capitalize(moduleName) + 'Ability');

    files.push(path.join(projectDir, moduleName, '/src/main/module.json5'));
    replaceInfos.push('entryability');
    strs.push(moduleName + 'ability');

    files.push(path.join(projectDir, moduleName, '/src/main/resources/base/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, moduleName, '/src/main/resources/en_US/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    files.push(path.join(projectDir, moduleName, '/src/main/resources/zh_CN/element/string.json'));
    replaceInfos.push('module_ability_name');
    strs.push(capitalize(moduleName) + 'Ability');
    if (moduleName !== 'entry') {
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
    const sdkVersion = getSdkVersion(projectDir);
    if (currentSystem === 'OpenHarmony' && String(sdkVersion) !== '10') {
      modifyOpenHarmonyOSConfig(projectDir, sdkVersion);
    }
    if (currentSystem === 'HarmonyOS') {
      modifyHarmonyOSConfig(projectDir, moduleName, sdkVersion);
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
    }) + capitalize(moduleName) + 'AbilityViewController';
    const srcFilePath = path.join(templateDir, 'ios/app/EntryEntryAbilityViewController');
    fs.writeFileSync(path.join(projectDir, '.arkui-x/ios/app/' + destClassName + '.h'),
      fs.readFileSync(srcFilePath + '.h').toString().replace(new RegExp('EntryEntryAbilityViewController', 'g'),
        destClassName));
    fs.writeFileSync(path.join(projectDir, '.arkui-x/ios/app/' + destClassName + '.m'),
      fs.readFileSync(srcFilePath + '.m').toString().replace(new RegExp('EntryEntryAbilityViewController', 'g'),
        destClassName));
    const createViewControlInfo =
      '} else if ([moduleName isEqualToString:@"' + moduleName + '"] && [abilityName ' +
      '  isEqualToString:@"' + capitalize(moduleName) + 'Ability"]) {\n' +
      '        NSString *instanceName = [NSString stringWithFormat:@"%@:%@:%@",' +
      'bundleName, moduleName, abilityName];\n' +
      '        ' + destClassName + ' *entryOtherVC = [[' + destClassName + ' alloc] ' +
      'initWithInstanceName:instanceName];\n' +
      '        entryOtherVC.params = params;\n' +
      '        subStageVC = (' + destClassName + ' *)entryOtherVC;\n' +
      '    } // other ViewController\n';
    const curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, '.arkui-x/ios/app/AppDelegate.m')).toString();
    const insertIndex = curManifestXmlInfo.lastIndexOf('} // other ViewController');
    const insertImportIndex = curManifestXmlInfo.lastIndexOf('#import "EntryEntryAbilityViewController.h"');
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
    if (isNativeCppTemplate(projectDir)) {
      addFileToPbxproj(pbxprojFilePath, 'hello.cpp', 'cfile', moduleName);
    }
    return true;
  } catch (error) {
    console.error('Error occurs when create in ios', error);
    return false;
  }
}

function createStageModule(moduleList, templateDir) {
  if (moduleList.length === 0) {
    if (createStageModuleInSource('entry', templateDir) &&
      createStageInAndroid('entry', templateDir)) {
      return replaceStageProjectInfo('entry');
    }
  } else {
    const question = [{
      name: 'moduleName',
      type: 'input',
      message: 'Enter the module name:',
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
      const moduleName = answers.moduleName;
      inquirer.prompt([{
        name: 'cross',
        type: 'input',
        message: 'Specify whether the module is a cross-platform module (y / n):',
        validate(val) {
          if (val.toLowerCase() !== 'y' && val.toLowerCase() !== 'n') {
            return 'Please enter y / n!';
          } else {
            return true;
          }
        }
      }]).then(answers => {
        if (answers.cross === 'y') {
          if (createStageModuleInSource(moduleName, templateDir)
            && createStageInAndroid(moduleName, templateDir)
            && createStageInIOS(moduleName, templateDir)) {
              addCrosssPlatform(projectDir, moduleName);
            return replaceStageProjectInfo(moduleName);
          }
        } else {
          if (createStageModuleInSource(moduleName, templateDir)) {
            return replaceStageProjectInfo(moduleName);
          }
        }
      });
    });
  }
}

function modifyModuleBuildProfile(projectDir, moduleName) {
  const moduleBuildProfile = path.join(projectDir, moduleName, '/build-profile.json5');
  if (moduleName !== 'entry' && fs.existsSync(moduleBuildProfile)) {
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
  } catch (e) {
    console.error('Replace Native C++ template failed.');
    return false;
  }
}

function replaceAndroidNativeCpp(moduleName) {
  try {
    const cMakeFile = path.join(projectDir, `.arkui-x/android/app/src/main/cpp/CMakeLists.txt`);
    const sourcePath = moduleName.toUpperCase() + `_NATIVE_SOURCE_PATH`;
    const data = `
set(${sourcePath} \${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../${moduleName}/src/main/cpp)
add_library(${moduleName} SHARED \${${sourcePath}}/hello.cpp)
target_link_libraries(${moduleName} PUBLIC arkui_android)`;

    const cMakeInfo = fs.readFileSync(cMakeFile, 'utf8').split(/\r\n|\n|\r/gm);
    cMakeInfo.splice(-1, 0, data);
    fs.writeFileSync(cMakeFile, cMakeInfo.join('\r\n'));
    return true;
  } catch (e) {
    console.error('Replace Android Native C++ failed.');
    return false;
  }
}
function replaceFileString(file, oldString, newString) {
  fs.writeFileSync(file, fs.readFileSync(file).toString().replace(oldString, newString));
}

function createModule() {
  if (!fs.existsSync(path.join(projectDir, 'hvigorw'))) {
    console.error(`Operation failed. Go to your ArkUI cross-platform project directory and try again.`);
    return false;
  }

  currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('current system is unknown.');
    return false;
  }
  const settingPath = path.join(projectDir, 'build-profile.json5');
  const moduleList = getModuleList(settingPath);
  if (moduleList === null) {
    console.error('Create module failed');
    return false;
  }
  let templateDir = path.join(__dirname, 'template');
  if (!fs.existsSync(templateDir)) {
    templateDir = globalThis.templatePath;
  }
  return createStageModule(moduleList, templateDir);
}

function updateCrossPlatformModules(currentSystem) {
  try {
    const updateModuleDir = [];
    const originDir = ['.arkui-x', '.hvigor', 'AppScope', 'hvigor', 'oh_modules'];
    const buildProfile = path.join(projectDir, 'build-profile.json5');
    const moduleListAll = getModuleList(buildProfile);
    fs.readdirSync(projectDir).forEach(dir => {
      if (!fs.statSync(dir).isDirectory() || originDir.includes(dir)) {
        return;
      }
      if (isExternalModuleDir(dir, moduleListAll)) {
        updateModuleDir.push(dir);
      }
    });
    if (updateModuleDir.length === 0) {
      return;
    }
    let templateDir = path.join(__dirname, 'template');
    if (!fs.existsSync(templateDir)) {
      templateDir = globalThis.templatePath;
    }

    updateModuleDir.forEach(module => {
      addCrosssPlatform(projectDir, module);
      replaceStageProfile(module);
      updateRuntimeOS(module, currentSystem);
      const moduleJsonInfo = JSON5.parse(fs.readFileSync(path.join(projectDir, module, 'src/main/module.json5')));
      const currentDir = path.join(projectDir, module);
      moduleJsonInfo.module.abilities.forEach(component => {
        createStageAbilityInIOS(module, component['name'], templateDir, currentDir);
        createStageAbilityInAndroid(module, component['name'], templateDir, currentDir);
      });
    })
  } catch (err) {
    console.log('update cross platform modules failed')
  }
}

function updateRuntimeOS(moduleName, currentSystem) {
  const buildProfile = path.join(projectDir, moduleName, 'build-profile.json5');
  const buildProfileInfo = JSON5.parse(fs.readFileSync(buildProfile));
  if (buildProfileInfo.targets[0].runtimeOS) {
    delete buildProfileInfo.targets[0].runtimeOS;
    fs.writeFileSync(buildProfile, JSON.stringify(buildProfileInfo, '', '  '));
  }
  const configFile = [path.join(projectDir, moduleName, 'src/main/module.json5'),
  path.join(projectDir, moduleName, 'src/ohosTest/module.json5')];
  let deviceTypes;
  if (currentSystem === 'OpenHarmony') {
    deviceTypes = ['default', 'tablet'];
  } else {
    deviceTypes = ['phone'];
  }
  configFile.forEach(config => {
    if (fs.existsSync(config)) {
      const configFileInfo = JSON5.parse(fs.readFileSync(config));
      configFileInfo.module['deviceTypes'] = deviceTypes;
      fs.writeFileSync(config, JSON.stringify(configFileInfo, '', '  '));
    }
  });
}

function isExternalModuleDir(dir, moduleListAll) {
  let isContinue = true;
  const files = ['build-profile.json5', 'hvigorfile.ts', 'oh-package.json5', 'src/main/ets'];
  files.forEach(file => {
    isContinue = isContinue && fs.existsSync(path.join(projectDir, dir, file));
  });

  if (isContinue) {
    const packageInfo = JSON5.parse(fs.readFileSync(path.join(projectDir, dir, 'oh-package.json5')));
    isContinue = isContinue && !moduleListAll.includes(packageInfo.name);
  }
  return isContinue;
}

module.exports = {
  createModule,
  updateCrossPlatformModules
};
