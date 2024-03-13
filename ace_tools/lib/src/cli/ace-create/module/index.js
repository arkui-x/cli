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
const { copy, modifyHarmonyOSConfig, addCrossPlatform, modifyOpenHarmonyOSConfig, modifyNativeCppConfig } = require('../util');
const { getSdkVersion } = require('../../util');
const { createStageAbilityInAndroid, createStageAbilityInIOS } = require('../ability');
const { getModuleList, getCurrentProjectSystem, getModuleType, addFileToPbxproj,
  isAppProject, getIosProjectName } = require('../../util');

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

  if (regEn.test(name) || regCn.test(name) || !isNaN(name[0])
    || name.length > 31 || name[0] === '_' || name.length === 1) {
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

function createStageInAndroid(moduleName, templateDir, moduleType) {
  let destDir = 'app';
  if (!isAppProject(projectDir)) {
    destDir = 'library';
  }
  const packageName = getPackageName();
  const packageArray = packageName.split('.');
  const src = path.join(templateDir, 'android/app/src/main/java');
  try {
    const templateFileName = 'MainActivity.java';
    const destClassName = moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + capitalize(moduleName) + 'AbilityActivity';
    let dest = path.join(projectDir, `.arkui-x/android/${destDir}/src/main/java`);
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
    if (isAppProject(projectDir) && fs.existsSync(path.join(dest, 'EntryEntryAbilityActivity.java'))) {
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
    }
    if (moduleType === 'NativeC++') {
      replaceAndroidNativeCpp(moduleName, templateDir, destDir);
    }
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Error occurs when create in android', error);
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
    console.error('\x1B[31m%s\x1B[0m', 'Get app name error.');
    return '';
  }
}

function createStageModuleInSource(moduleName, templateDir, moduleType) {
  const destPath = path.join(projectDir, moduleName);
  let srcPath;
  let copyFlag = true;
  try {
    fs.mkdirSync(destPath, { recursive: true });
    if (moduleType === 'ShareAbility') {
      srcPath = path.join(templateDir, 'share_library');
    } else if (moduleType === 'ShareC++') {
      srcPath = path.join(templateDir, 'share_library');
      copyFlag = copyNativeToModule(moduleName, templateDir);
    } else if (moduleType === 'NativeC++') {
      srcPath = path.join(templateDir, 'cpp_ets_stage/source/entry');
      copyFlag = copyNativeToModule(moduleName, templateDir);
    } else {
      srcPath = path.join(templateDir, 'ets_stage/source/entry');
    }
    return copyFlag && copy(srcPath, destPath);
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Error occurs when creating module template.');
    return false;
  }
}

function modifyStageProfile(moduleName, modulePath, moduleType) {
  try {
    if (moduleName !== 'entry' && (moduleType === 'EmptyAbility' || moduleType === 'NativeC++')) {
      const srcModulePath = path.join(projectDir, modulePath, 'src/main/module.json5');
      const modulePathJson = JSON5.parse(fs.readFileSync(srcModulePath).toString());
      delete modulePathJson.module.abilities[0].skills;
      fs.writeFileSync(srcModulePath, JSON5.stringify(modulePathJson, '', '  '));
      modifyModuleBuildProfile(projectDir, moduleName, modulePath);
    }
    if (moduleType === 'NativeC++' || moduleType === 'ShareC++') {
      const appName = getAppNameForModule();
      if (appName === '') {
        return false;
      }
      modifyNativeCppTemplate(moduleName, appName, modulePath);
    }
    if (moduleType === 'ShareC++') {
      modifyShareNative(moduleName, modulePath);
    }
    modifyBuildProfile(moduleName, modulePath);
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'modify stage project info error.');
    return false;
  }
}

function modifyBuildProfile(moduleName, modulePath) {
  const srcBuildPath = path.join(projectDir, 'build-profile.json5');
  try {
    const buildPathJson = JSON5.parse(fs.readFileSync(srcBuildPath).toString());
    const moduleInfo = {
      'name': moduleName,
      'srcPath': './' + modulePath,
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

function replaceStageProjectInfo(moduleName, moduleType) {
  try {
    const files = [];
    const replaceInfos = [];
    const strs = [];
    const mainPath = path.join(projectDir, moduleName, 'src', 'main');

    files.push(path.join(projectDir, moduleName, 'oh-package.json5'));
    replaceInfos.push('module_name');
    strs.push(moduleName);
    files.push(path.join(mainPath, 'module.json5'));
    replaceInfos.push('module_name');
    strs.push(moduleName);
    if (moduleType !== 'ShareC++' && moduleType !== 'ShareAbility') {
      if (moduleName !== 'entry') {
        files.push(path.join(mainPath, 'module.json5'));
        replaceInfos.push(`"entry"`);
        strs.push(`"feature"`);
      }
      files.push(path.join(mainPath, 'module.json5'));
      replaceInfos.push('module_ability_name');
      strs.push(capitalize(moduleName) + 'Ability');
      files.push(path.join(mainPath, 'module.json5'));
      replaceInfos.push('EntryAbility');
      strs.push(capitalize(moduleName) + 'Ability');
      files.push(path.join(mainPath, 'module.json5'));
      replaceInfos.push('entryability');
      strs.push(moduleName + 'ability');

      files.push(path.join(projectDir, moduleName, 'src/ohosTest/module.json5'));
      replaceInfos.push('module_test_name');
      strs.push(moduleName + '_test');
      files.push(path.join(mainPath, 'resources/base/element/string.json'));
      replaceInfos.push('module_ability_name');
      strs.push(capitalize(moduleName) + 'Ability');
      files.push(path.join(mainPath, 'resources/en_US/element/string.json'));
      replaceInfos.push('module_ability_name');
      strs.push(capitalize(moduleName) + 'Ability');
      files.push(path.join(mainPath, 'resources/zh_CN/element/string.json'));
      replaceInfos.push('module_ability_name');
      strs.push(capitalize(moduleName) + 'Ability');
      const targetAbilityDir = path.join(mainPath, 'ets', moduleName + 'ability');
      fs.renameSync(path.join(mainPath, 'ets', 'entryability'), targetAbilityDir);
      fs.renameSync(path.join(targetAbilityDir, 'EntryAbility.ets'), path.join(targetAbilityDir, capitalize(moduleName) + 'Ability.ets'));
      files.push(path.join(targetAbilityDir, capitalize(moduleName) + 'Ability.ets'));
      replaceInfos.push('EntryAbility');
      strs.push(capitalize(moduleName) + 'Ability');
    }

    files.forEach((filePath, index) => {
      fs.writeFileSync(filePath,
        fs.readFileSync(filePath).toString().replace(new RegExp(replaceInfos[index], 'g'), strs[index]));
    });
    if (!modifyStageProfile(moduleName, moduleName, moduleType)) {
      console.error('\x1B[31m%s\x1B[0m', 'Please check stage project.');
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
    console.error('\x1B[31m%s\x1B[0m', 'Replace project info error.');
    return false;
  }
}

function createStageInIOS(moduleName, templateDir, moduleType) {
  try {
    const iosPath = getIosProjectName(projectDir);
    const destClassName = moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + capitalize(moduleName) + 'AbilityViewController';
    const srcFilePath = path.join(templateDir, `ios/app/EntryEntryAbilityViewController`);
    fs.writeFileSync(path.join(projectDir, `.arkui-x/ios/${iosPath}/` + destClassName + '.h'),
      fs.readFileSync(srcFilePath + '.h').toString().replace(new RegExp('EntryEntryAbilityViewController', 'g'),
        destClassName));
    fs.writeFileSync(path.join(projectDir, `.arkui-x/ios/${iosPath}/` + destClassName + '.m'),
      fs.readFileSync(srcFilePath + '.m').toString().replace(new RegExp('EntryEntryAbilityViewController', 'g'),
        destClassName));
    if (iosPath === 'app' || iosPath === 'myframework') {
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

      let delegateFile;
      if (iosPath === 'myframework') {
        delegateFile = path.join(projectDir, `.arkui-x/ios/${iosPath}/ArkUIAppDelegate.m`);
      } else {
        delegateFile = path.join(projectDir, `.arkui-x/ios/${iosPath}/AppDelegate.m`);
      }
      const curManifestXmlInfo = fs.readFileSync(delegateFile).toString();
      const insertIndex = curManifestXmlInfo.lastIndexOf('} // other ViewController');
      const insertImportIndex = curManifestXmlInfo.lastIndexOf('#import "EntryEntryAbilityViewController.h"');
      const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertImportIndex) +
        '#import "' + destClassName + '.h"\n' +
        curManifestXmlInfo.slice(insertImportIndex, insertIndex) +
        createViewControlInfo + curManifestXmlInfo.slice(insertIndex + 26);
      fs.writeFileSync(delegateFile, updateManifestXmlInfo);
    }
    const pbxprojFilePath = path.join(projectDir, `.arkui-x/ios/${iosPath}.xcodeproj/project.pbxproj`);
    if (!addFileToPbxproj(pbxprojFilePath, destClassName + '.h', 'headfile') ||
      !addFileToPbxproj(pbxprojFilePath, destClassName + '.m', 'sourcefile')) {
      return false;
    }
    if (moduleType === 'NativeC++') {
      replaceiOSNativeCpp(pbxprojFilePath);
      addFileToPbxproj(pbxprojFilePath, 'hello.cpp', 'cfile', moduleName);
    }
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Error occurs when create in ios', error);
    return false;
  }
}

function createStageModule(moduleList, templateDir) {
  const question = [{
    name: 'moduleName',
    type: 'input',
    message: 'Enter the module name:',
    validate(val) {
      if (!isModuleNameQualified(val)) {
        console.log('\x1B[31m%s\x1B[0m', 'Module name must contain 2 to 31 characters, start with a letter, ' +
          'and include only letters, digits and underscores (_).');
        return false;
      }
      return checkModuleName(moduleList, val);
    }
  }];
  inquirer.prompt(question).then(answers => {
    const moduleName = answers.moduleName;
    inquirer.prompt([{
      name: 'type',
      type: 'input',
      message: 'Enter the module type: (1: Empty Ability, 2: Native C++, 3: Share Library):',
      validate(val) {
        if (val === '1' || val === '2' || val === '3') {
          return true;
        } else {
          return 'input must be an integer: 1 or 2 or 3.';
        }
      }
    }]).then(answers => {
      let moduleType;
      if (answers.type === '3') {
        inquirer.prompt([{
          name: 'enable',
          type: 'input',
          message: 'if enable native module (y / n):',
          validate(val) {
            if (val.toLowerCase() !== 'y' && val.toLowerCase() !== 'n') {
              return 'Please enter y / n!';
            } else {
              return true;
            }
          }
        }]).then(answers => {
          if (answers.enable === 'y') {
            moduleType = 'ShareC++';
          } else {
            moduleType = 'ShareAbility';
          }
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
            if (createStageModuleInSource(moduleName, templateDir, moduleType)) {
              if (answers.cross === 'y') {
                addCrossPlatform(projectDir, moduleName);
              }
              return replaceStageProjectInfo(moduleName, moduleType);
            }
          });
        });
      } else {
        if (answers.type === '2') {
          moduleType = 'NativeC++';
        } else {
          moduleType = 'EmptyAbility';
        }
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
            if (createStageModuleInSource(moduleName, templateDir, moduleType)
              && createStageInAndroid(moduleName, templateDir, moduleType)
              && createStageInIOS(moduleName, templateDir, moduleType)) {
              addCrossPlatform(projectDir, moduleName);
              return replaceStageProjectInfo(moduleName, moduleType);
            }
          } else {
            if (createStageModuleInSource(moduleName, templateDir, moduleType)) {
              return replaceStageProjectInfo(moduleName, moduleType);
            }
          }
        });
      }
    });
  });
}

function modifyModuleBuildProfile(projectDir, moduleName, modulePath) {
  const moduleBuildProfile = path.join(projectDir, modulePath, '/build-profile.json5');
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

function modifyShareNative(moduleName, modulePath) {
  try {
    const moduleToLower = moduleName.toLowerCase();
    const baseModulePath = path.join(projectDir, modulePath);
    const packageJsonPath = path.join(baseModulePath, 'oh-package.json5');
    const packageJsonInfo = fs.readFileSync(packageJsonPath, 'utf8').toString();
    const searchLib = `"dependencies": {`;
    const addLibIndex = packageJsonInfo.lastIndexOf(searchLib);
    const addLib = `
    "lib${moduleToLower}.so": "file:./src/main/cpp/types/lib${moduleToLower}"`;
    const updatePackageJsonInfo = packageJsonInfo.slice(0, addLibIndex + searchLib.length) + addLib +
      packageJsonInfo.slice(addLibIndex + searchLib.length);
    fs.writeFileSync(packageJsonPath, updatePackageJsonInfo);

    const buildProfilePath = path.join(baseModulePath, 'build-profile.json5');
    const buildProfileInfo = fs.readFileSync(buildProfilePath, 'utf8').toString();
    const searchOption = `"buildOption": {`;
    const addOptionIndex = buildProfileInfo.indexOf(searchOption);
    const addOption = `
    "externalNativeOptions": {
      "path": "./src/main/cpp/CMakeLists.txt",
      "arguments": "",
      "cppFlags": ""
    },`;
    const updatebuildProfileInfo = buildProfileInfo.slice(0, addOptionIndex + searchOption.length) +
      addOption + buildProfileInfo.slice(addOptionIndex + searchOption.length);
    fs.writeFileSync(buildProfilePath, updatebuildProfileInfo);

    const etsPath = path.join(baseModulePath, 'src/main/ets/pages/Index.ets');
    const etsInfo = fs.readFileSync(etsPath, 'utf8').toString();
    const searchImport = `@Entry`;
    const addImportIndex = etsInfo.indexOf(searchImport);
    const addImport = `
import hilog from '@ohos.hilog';
import testNapi from 'lib${moduleToLower}.so';
    \n`;
    const searchClick = `.fontWeight(FontWeight.Bold)`;
    const addClickIndex = etsInfo.indexOf(searchClick);
    const addClick = `
          .onClick(() => {
            hilog.info(0x0000, 'testTag', 'Test NAPI 2 + 3 = %{public}d', testNapi.add(2, 3));
          })`;
    const updateEtsInfoInfo = etsInfo.slice(0, addImportIndex) + addImport +
      etsInfo.slice(addImportIndex, addClickIndex + searchClick.length) +
      addClick + etsInfo.slice(addClickIndex + searchClick.length);
    fs.writeFileSync(etsPath, updateEtsInfoInfo);

    return true;
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m', 'Replace share native template failed.');
    return false;
  }
}

function modifyNativeCppTemplate(moduleName, appName, modulePath) {
  try {
    const baseModulePath = path.join(projectDir, modulePath);
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
    console.error('\x1B[31m%s\x1B[0m', 'Replace Native C++ template failed.');
    return false;
  }
}

function replaceiOSNativeCpp(pbxprojFilePath) {
  const pbxprojFileInfo = fs.readFileSync(pbxprojFilePath).toString();
  if (pbxprojFileInfo.includes('USER_HEADER_SEARCH_PATHS')) {
    return true;
  }
  const searchHeader = 'TARGETED_DEVICE_FAMILY = "1,2";';
  const addHeader = `
                USER_HEADER_SEARCH_PATHS = "$(SRCROOT)/frameworks/libarkui_ios.xcframework/ios-arm64/libarkui_ios.framework/Headers/include";`;
  try {
    const add1stHeaderIndex = pbxprojFileInfo.indexOf(searchHeader);
    const add2ndHeaderIndex = pbxprojFileInfo.lastIndexOf(searchHeader);
    const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, add1stHeaderIndex + searchHeader.length) +
      addHeader + pbxprojFileInfo.slice(add1stHeaderIndex + searchHeader.length, add2ndHeaderIndex + searchHeader.length) +
      addHeader + pbxprojFileInfo.slice(add2ndHeaderIndex + searchHeader.length);
    fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
  } catch (e) {
    return false;
  }
  return true;
}

function replaceAndroidNativeCpp(moduleName, templateDir, destDir) {
  try {
    const cMakeFile = path.join(projectDir, `.arkui-x/android/${destDir}/src/main/cpp/CMakeLists.txt`);
    if (fs.existsSync(cMakeFile)) {
      const sourcePath = moduleName.toUpperCase() + `_NATIVE_SOURCE_PATH`;
      const data = `
set(${sourcePath} \${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../${moduleName}/src/main/cpp)
add_library(${moduleName} SHARED \${${sourcePath}}/hello.cpp)
target_link_libraries(${moduleName} PUBLIC arkui_android)`;

      const cMakeInfo = fs.readFileSync(cMakeFile, 'utf8').split(/\r\n|\n|\r/gm);
      cMakeInfo.splice(-1, 0, data);
      fs.writeFileSync(cMakeFile, cMakeInfo.join('\r\n'));
      return true;
    } else {
      if (!copy(path.join(templateDir, '/cpp/cpp_android/'), path.dirname(cMakeFile))) {
        return false;
      }
      const sdkVersion = getSdkVersion(projectDir);
      if (sdkVersion !== '10') {
        let data = fs.readFileSync(cMakeFile, 'utf8');
        data = data.replace(`$ENV{ARKUIX_SDK_HOME}/10`, `$ENV{ARKUIX_SDK_HOME}/${sdkVersion}`);
        fs.writeFileSync(cMakeFile, data);
      }
      const projectName = getAppNameForModule();
      if (projectName === '') {
        return false;
      }
      replaceFileString(cMakeFile, /entry/g, moduleName.toLowerCase());
      return modifyNativeCppConfig(projectDir, projectName, destDir);
    }
  } catch (e) {
    console.error('\x1B[31m%s\x1B[0m', 'Replace Android Native C++ failed.');
    return false;
  }
}

function replaceFileString(file, oldString, newString) {
  fs.writeFileSync(file, fs.readFileSync(file).toString().replace(oldString, newString));
}

function createModule() {
  if (!fs.existsSync(path.join(projectDir, 'hvigorw'))) {
    console.error('\x1B[31m%s\x1B[0m', `Operation failed. Go to your ArkUI cross-platform project directory and try again.`);
    return false;
  }

  currentSystem = getCurrentProjectSystem(projectDir);
  if (!currentSystem) {
    console.error('\x1B[31m%s\x1B[0m', 'current system is unknown.');
    return false;
  }
  const moduleList = getModuleList(projectDir);
  if (moduleList === null) {
    console.error('\x1B[31m%s\x1B[0m', 'Create module failed');
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
    const updateModuleDir = new Map();
    const originDir = ['.arkui-x', '.hvigor', 'AppScope', 'hvigor', 'oh_modules'];
    const moduleListAll = getModuleList(projectDir);
    fs.readdirSync(projectDir).forEach(dir => {
      if (!fs.statSync(dir).isDirectory() || originDir.includes(dir)) {
        return;
      }
      if (isExternalModuleDir(dir, moduleListAll)) {
        const module = JSON5.parse(fs.readFileSync(path.join(projectDir, dir, 'oh-package.json5'))).name;
        updateModuleDir.set(module, dir);
      }
    });
    if (updateModuleDir.size === 0) {
      return;
    }
    let templateDir = path.join(__dirname, 'template');
    if (!fs.existsSync(templateDir)) {
      templateDir = globalThis.templatePath;
    }
    updateModuleDir.forEach((modulePath, module) => {
      const moduleType = getModuleType(projectDir, modulePath);
      if (moduleType === '') {
        return;
      }
      modifyBuildProfile(module, modulePath);
      updateRuntimeOS(modulePath, currentSystem);
      if (moduleType === 'NativeC++' || moduleType === 'EmptyAbility') {
        addCrossPlatform(projectDir, module);
        const moduleJsonInfo = JSON5.parse(fs.readFileSync(path.join(projectDir, modulePath, 'src/main/module.json5')));
        const currentDir = path.join(projectDir, modulePath);
        moduleJsonInfo.module.abilities.forEach(component => {
          createStageAbilityInIOS(module, component['name'], templateDir, currentDir);
          createStageAbilityInAndroid(module, component['name'], templateDir, currentDir);
        });
      }
    });
  } catch (err) {
    console.error('update cross platform modules failed.');
  }
}

function updateRuntimeOS(modulePath, currentSystem) {
  const buildProfile = path.join(projectDir, modulePath, 'build-profile.json5');
  const buildProfileInfo = JSON5.parse(fs.readFileSync(buildProfile));
  if (buildProfileInfo.targets[0].runtimeOS) {
    delete buildProfileInfo.targets[0].runtimeOS;
    fs.writeFileSync(buildProfile, JSON.stringify(buildProfileInfo, '', '  '));
  }
  const configFile = [path.join(projectDir, modulePath, 'src/main/module.json5'),
    path.join(projectDir, modulePath, 'src/ohosTest/module.json5')];
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
