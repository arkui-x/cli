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
const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');
const plist = require('plist');
const inquirer = require('inquirer');
const { replaceInfo, getArkuixPluginWithModelVersion } = require('../util/index');
const { createStageInIOS, createStageInAndroid } = require('../ace-create/module/index');

function modifyCopyFileSync(source, destination) {
  fs.copyFileSync(source, destination);
}

function modifyCopyFolderSync(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    let destinationName = entry.name;
    if (entry.name === 'AppDelegate_stage.h') {
      destinationName = 'AppDelegate.h';
    } else if (entry.name === 'AppDelegate_stage.m') {
      destinationName = 'AppDelegate.m';
    }
    const destPath = path.join(destination, destinationName);
    if (entry.isDirectory()) {
      modifyCopyFolderSync(srcPath, destPath);
    } else {
      modifyCopyFileSync(srcPath, destPath);
    }
  }
}

function getAppName() {
  let appName = '';
  const appJsonPath = './APPScope/app.json5';
  const data = fs.readFileSync(appJsonPath, 'utf8');
  const jsonObj = JSON5.parse(data);
  appName = jsonObj.app.bundleName;
  return appName;
}

function cleanStr(baseStr, charToRemove) {
  let str = baseStr;
  while (str[0] === charToRemove) {
    str = str.slice(1);
  }
  while (str[str.length - 1] === charToRemove) {
    str = str.slice(0, -1);
  }
  return str;
}

function getPackageName() {
  let packageName = '';
  const packageJsonPath = './APPScope/resources/base/element/string.json';
  const data = fs.readFileSync(packageJsonPath, 'utf8');
  const jsonObj = JSON5.parse(data);
  for (let i = 0; i < jsonObj.string.length; i++) {
    if (jsonObj.string[i].name && jsonObj.string[i].name === 'app_name') {
      packageName = jsonObj.string[i].value;
      break;
    }
  }
  return packageName;
}

function replaceAndroidProjectInfo(appName, packageName) {
  const files = [];
  const replaceInfos = [];
  const strs = [];

  files.push('./.arkui-x/android/settings.gradle');
  replaceInfos.push('appName');
  strs.push(packageName);
  files.push('./.arkui-x/android/app/src/main/res/values/strings.xml');
  replaceInfos.push('appName');
  strs.push(packageName);
  files.push('./.arkui-x/android/app/src/main/AndroidManifest.xml');
  replaceInfos.push('packageName');
  strs.push(appName);
  files.push('./.arkui-x/android/app/build.gradle');
  replaceInfos.push('packageName');
  strs.push(appName);
  files.push('./.arkui-x/android/app/src/main/java/MainActivity.java');
  replaceInfos.push('package packageName');
  strs.push(`package ${appName}`);
  files.push('./.arkui-x/android/app/src/main/java/MyApplication.java');
  replaceInfos.push('package packageName');
  strs.push(`package ${appName}`);
  files.push('./.arkui-x/android/app/src/androidTest/java/ExampleInstrumentedTest.java');
  replaceInfos.push('package packageName');
  strs.push(`package ${appName}`);
  files.push('./.arkui-x/android/app/src/test/java/ExampleUnitTest.java');
  replaceInfos.push('package packageName');
  strs.push(`package ${appName}`);
  replaceInfo(files, replaceInfos, strs);
}

function replaceiOSProjectInfo(appName) {
  const files = [];
  const replaceInfos = [];
  const strs = [];

  files.push('./.arkui-x/ios/app.xcodeproj/project.pbxproj');
  replaceInfos.push('bundleIdentifier');
  strs.push(appName);
  files.push('./.arkui-x/ios/app/AppDelegate.m');
  replaceInfos.push('packageName');
  strs.push(appName);
  replaceInfo(files, replaceInfos, strs);
}

function getModulePath(moduleName) {
  let modulePath = '';
  try {
    fs.accessSync('./build-profile.json5', fs.constants.F_OK);
  } catch (err) {
    return modulePath;
  }
  const data = fs.readFileSync('./build-profile.json5', 'utf8');
  const jsonObj = JSON5.parse(data);
  for (let i = 0; i < jsonObj.modules.length; i++) {
    if (jsonObj.modules[i].name && jsonObj.modules[i].name === moduleName) {
      modulePath = jsonObj.modules[i].srcPath;
      break;
    }
  }
  return modulePath;
}

function getModuleAbility(moduleName) {
  const modulePath = getModulePath(moduleName);
  let abilityName = '';
  try {
    fs.accessSync(`${modulePath}/src/main/module.json5`, fs.constants.F_OK);
  } catch (err) {
    return abilityName;
  }
  const data = fs.readFileSync(`${modulePath}/src/main/module.json5`, 'utf8');
  const jsonObj = JSON5.parse(data);
  abilityName = jsonObj.module.mainElement;
  return abilityName;
}

function modifyCrossModule(moduleName, appName) {
  const files = [];
  const replaceInfos = [];
  const strs = [];

  const abilityName = getModuleAbility(moduleName);
  files.push('./.arkui-x/android/app/src/main/java/MainActivity.java');
  replaceInfos.push('ArkUIInstanceName');
  strs.push(`${appName}:${moduleName}:${abilityName}:`);
  files.push('./.arkui-x/android/app/src/main/java/MainActivity.java');
  replaceInfos.push('MainActivity');
  const newModuleName = moduleName[0].toUpperCase() + moduleName.slice(1);
  const activityName = `${newModuleName}${abilityName}Activity`;
  strs.push(activityName);
  files.push('./.arkui-x/android/app/src/main/AndroidManifest.xml');
  replaceInfos.push('MainActivity');
  strs.push(activityName);
  const nowName = newModuleName + abilityName;
  files.push('./.arkui-x/ios/app/EntryEntryAbilityViewController.m');
  replaceInfos.push('EntryEntryAbilityViewController');
  strs.push(`${nowName}ViewController`);
  files.push('./.arkui-x/ios/app/EntryEntryAbilityViewController.h');
  replaceInfos.push('EntryEntryAbilityViewController');
  strs.push(`${nowName}ViewController`);
  files.push('./.arkui-x/ios/app/AppDelegate.m');
  replaceInfos.push('EntryEntryAbilityViewController');
  strs.push(`${nowName}ViewController`);
  files.push('./.arkui-x/ios/app.xcodeproj/project.pbxproj');
  replaceInfos.push('EntryEntryAbilityViewController');
  strs.push(`${nowName}ViewController`);
  files.push('./.arkui-x/ios/app/AppDelegate.m');
  replaceInfos.push('"entry"');
  strs.push(`"${moduleName}"`);
  files.push('./.arkui-x/ios/app/AppDelegate.m');
  replaceInfos.push('"EntryAbility"');
  strs.push(`"${abilityName}"`);
  replaceInfo(files, replaceInfos, strs);
  fs.renameSync('./.arkui-x/android/app/src/main/java/MainActivity.java', `./.arkui-x/android/app/src/main/java/${activityName}.java`);
  fs.renameSync('./.arkui-x/ios/app/EntryEntryAbilityViewController.m', `./.arkui-x/ios/app/${nowName}ViewController.m`);
  fs.renameSync('./.arkui-x/ios/app/EntryEntryAbilityViewController.h', `./.arkui-x/ios/app/${nowName}ViewController.h`);
}

function modifyModuleHvigorInfo(moduleName, moduleType) {
  const files = [];
  const replaceInfos = [];
  const strs = [];
  const modulePath = getModulePath(moduleName);
  files.push(`${modulePath}/hvigorfile.ts`);
  replaceInfos.push('@ohos/hvigor-ohos-plugin');
  strs.push('@ohos/hvigor-ohos-arkui-x-plugin');
  files.push(`${modulePath}/hvigorfile.ts`);
  if (moduleType === 'entry' || moduleType === 'feature') {
    replaceInfos.push('hapTasks');
    strs.push('HapTasks');
  } else if (moduleType === 'shared') {
    replaceInfos.push('hspTasks');
    strs.push('HspTasks');
  } else {
    replaceInfos.push('');
    strs.push('');
  }
  replaceInfo(files, replaceInfos, strs);
}

function modifyProjectHvigorInfo() {
  const files = [];
  const replaceInfos = [];
  const strs = [];
  files.push('./hvigorfile.ts');
  replaceInfos.push('appTasks');
  strs.push('AppTasksForArkUIX');
  files.push('./hvigorfile.ts');
  replaceInfos.push('@ohos/hvigor-ohos-plugin');
  strs.push('@ohos/hvigor-ohos-arkui-x-plugin');
  replaceInfo(files, replaceInfos, strs);
  const hvigorConfigPath = './hvigor/hvigor-config.json5';
  const data = fs.readFileSync(hvigorConfigPath, 'utf8');
  const jsonObj = JSON5.parse(data);
  if (!('@ohos/hvigor-ohos-arkui-x-plugin' in jsonObj.dependencies)) {
    jsonObj.dependencies['@ohos/hvigor-ohos-arkui-x-plugin'] = getArkuixPluginWithModelVersion(jsonObj.modelVersion);
  }
  const newJsonString = JSON5.stringify(jsonObj);
  fs.writeFileSync(hvigorConfigPath, newJsonString, 'utf8');
}

function createPackageFile(packagePaths, packageArray) {
  for (let i = 0; i < packagePaths.length; i++) {
    const entries = fs.readdirSync(packagePaths[i], { withFileTypes: true });
    const oldPath = packagePaths[i];
    let newPath = packagePaths[i];
    for (const packageInfo of packageArray) {
      newPath = `${newPath}/${packageInfo}`;
      fs.mkdirSync(newPath, { recursive: true });
    }
    for (const entry of entries) {
      modifyCopyFileSync(`${oldPath}/${entry.name}`, `${newPath}/${entry.name}`);
      fs.unlinkSync(`${oldPath}/${entry.name}`);
    }
  }
}

function modifyDirStructure(appName) {
  const packageArray = appName.split('.');
  const aospJavaPath = './.arkui-x/android/app/src/main/java';
  const testAospJavaPath = './.arkui-x/android/app/src/test/java';
  const androidTestAospJavaPath = './.arkui-x/android/app/src/androidTest/java';
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function getModuleType(moduleName, modulePath) {
  let moduleType = '';
  const moduleJsonPath = `${modulePath}/src/main/module.json5`;
  try {
    fs.accessSync(moduleJsonPath, fs.constants.F_OK);
  } catch (err) {
    console.log('\x1B[31m%s\x1B[0m', `Error: module ${moduleName} is not HarmonyOS module!`);
    return '';
  }
  const data = fs.readFileSync(moduleJsonPath, 'utf8');
  const jsonObj = JSON5.parse(data);
  moduleType = jsonObj.module.type;
  return moduleType;
}

function checkProblem() {
  const filePath = './build-profile.json5';
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.split('\n');
  let isHaveProblem = false;
  for (let j = 0; j < lines.length; j++) {
    if (lines[j].includes('useNormalizedOHMUrl')) {
      isHaveProblem = true;
      break;
    }
  }
  if (isHaveProblem) {
    console.log('\x1b[33m%s\x1b[0m', `WARN: arkui-x project must delete the 'useNormalizedOHMUrl' Setting Items in build-profile.json5`);
  }
}

function addModuleInArkuixConfig(hspModule) {
  const akruixConfigPath = './.arkui-x/arkui-x-config.json5';
  if (!fs.existsSync(akruixConfigPath)) {
    console.log('\x1B[31m%s\x1B[0m', `Error: The project does not contain the .arkui-x/arkui-x-config.json5 file. please modify an entry/feature type module as the cross-platform entry!`);
    return;
  }
  const data = fs.readFileSync(akruixConfigPath, 'utf8');
  const jsonObj = JSON5.parse(data);
  for (let i = 0; i < hspModule.length; i++) {
    jsonObj.modules.push(hspModule[i]);
  }
  const newJsonString = JSON5.stringify(jsonObj);
  fs.writeFileSync(akruixConfigPath, newJsonString, 'utf8');
}

function addUrlInIosPlist() {
  const infoPlistPath = './.arkui-x/ios/app/Info.plist';
  const infoPlistContent = fs.readFileSync(infoPlistPath, 'utf8');
  const infoPlist = plist.parse(infoPlistContent);
  const bundleName = getAppName();
  if (!infoPlist.CFBundleURLTypes) {
    infoPlist.CFBundleURLTypes = [];
  }
  if (infoPlist.CFBundleURLTypes.length > 0) {
    if (!infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes) {
      infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes = [];
    }
    infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes = [bundleName];
  } else {
    infoPlist.CFBundleURLTypes.push({
      CFBundleURLSchemes: [bundleName],
    });
  }
  const updatedInfoPlistContent = plist.build(infoPlist);
  fs.writeFileSync(infoPlistPath, updatedInfoPlistContent, 'utf8');
}

function modifyEntryModule(moduleName) {
  fs.mkdirSync('.arkui-x');
  modifyCopyFileSync(`${globalThis.templatePath}/arkui-x-config.json5`, './.arkui-x/arkui-x-config.json5');
  const jsonData = JSON5.parse(fs.readFileSync('./.arkui-x/arkui-x-config.json5', 'utf8'));
  jsonData.modules = [];
  fs.writeFileSync('./.arkui-x/arkui-x-config.json5', JSON5.stringify(jsonData, null));
  modifyCopyFolderSync(`${globalThis.templatePath}/android`, './.arkui-x/android');
  modifyCopyFolderSync(`${globalThis.templatePath}/ios`, './.arkui-x/ios');
  const appName = getAppName();
  const packageName = getPackageName();
  replaceAndroidProjectInfo(appName, packageName);
  replaceiOSProjectInfo(appName);
  modifyCrossModule(moduleName, appName);
  modifyProjectHvigorInfo();
  modifyModuleHvigorInfo(moduleName, 'entry');
  modifyDirStructure(appName);
}

function modifyFeatureModule(moduleName) {
  let templateDir = path.join(__dirname, 'template');
  if (!fs.existsSync(templateDir)) {
    templateDir = globalThis.templatePath;
  }
  createStageInIOS(moduleName, templateDir, 'feature');
  addUrlInIosPlist();
  createStageInAndroid(moduleName, templateDir, 'feature');
  modifyModuleHvigorInfo(moduleName, 'feature');
}

function copyAndroidiOSTemplate(moduleName, type) {
  if (type === 'entry') {
    modifyEntryModule(moduleName);
  } else if (type === 'feature') {
    if (fs.existsSync('./.arkui-x')) {
      modifyFeatureModule(moduleName);
    } else {
      modifyEntryModule(moduleName);
    }
  } else if (type === 'shared') {
    modifyModuleHvigorInfo(moduleName, 'shared');
  } else if (type === 'har') {
    return true;
  } else {
    return false;
  }
  return true;
}

function modifyProject() {
  if (fs.existsSync('./.arkui-x')) {
    console.log('\x1B[31m%s\x1B[0m', `Error: The current project is a cross-platform project. If you need to modify the new module, run the ace modify --modules command.`);
    return;
  }
  const filePath = './build-profile.json5';
  if (!fs.existsSync(filePath)) {
    console.log('\x1B[31m%s\x1B[0m', `Error: Operation failed. Go to your project directory and try again.`);
    return;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  const modulesArray = [];
  const modulesTypeArray = [];
  const entryTypeArray = [];
  for (let i = 0; i < jsonObj.modules.length; i++) {
    modulesArray.push(jsonObj.modules[i].name);
    const nowModuleType = getModuleType(jsonObj.modules[i].name, jsonObj.modules[i].srcPath);
    modulesTypeArray.push(nowModuleType);
    if (nowModuleType === 'entry') {
      entryTypeArray.push(jsonObj.modules[i].name);
    }
  }
  const modifyType = initModifyType();
  if (entryTypeArray.length < 1) {
    console.log('\x1B[31m%s\x1B[0m', `Error: The project does not have an entry module，cannot be modify!`);
  } else if (entryTypeArray.length === 1) {
    modifyModulesWithOneEntry(modulesArray, modulesTypeArray, entryTypeArray[0], modifyType.modifyTypeProject);
  } else {
    modifyModulesWithMultiEntry(modulesArray, modulesTypeArray, entryTypeArray, modifyType.modifyTypeProject);
  }
}

function modifyProjectModules(modulesArray, modulesTypeArray) {
  const arkuixModuleArray = [];
  for (let i = 0; i < modulesArray.length; i++) {
    copyAndroidiOSTemplate(modulesArray[i], modulesTypeArray[i]);
    if (modulesTypeArray[i] === 'entry' || modulesTypeArray[i] === 'feature' || modulesTypeArray[i] === 'shared') {
      arkuixModuleArray.push(modulesArray[i]);
    }
  }
  if (arkuixModuleArray.length > 0) {
    addModuleInArkuixConfig(arkuixModuleArray);
  }
  checkProblem();
  console.log('modify HarmonyOS project to ArkUI-X project success!');
}

function modifyModules(modules) {
  const filePath = './build-profile.json5';
  if (!fs.existsSync(filePath)) {
    console.log('\x1B[31m%s\x1B[0m', `Error: Operation failed. Go to your project directory and try again.`);
    return;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  const modulesArray = [];
  const modulesTypeArray = [];
  const entryTypeArray = [];
  const isHaveFeatureModule = false;
  for (let i = 0; i < jsonObj.modules.length; i++) {
    if (modules.includes(jsonObj.modules[i].name)) {
      modulesArray.push(jsonObj.modules[i].name);
      const nowModuleType = getModuleType(jsonObj.modules[i].name, jsonObj.modules[i].srcPath);
      modulesTypeArray.push(nowModuleType);
      if (nowModuleType === 'entry') {
        entryTypeArray.push(jsonObj.modules[i].name);
      }
      if (nowModuleType === 'feature') {
        isHaveFeatureModule = true;
      }
    }
  }
  checkNotInProjectModules(modules, modulesArray);
  let isHaveArkuiX = false;
  if (fs.existsSync('./.arkui-x')) {
    isHaveArkuiX = true;
  }
  if (isHaveArkuiX && entryTypeArray.length > 0) {
    console.log('\x1B[31m%s\x1B[0m', `Error: The entered modules contains entry type module. The project is a cross-platform project and cannot be modified`);
    return;
  }
  const modifyType = initModifyType();
  if (entryTypeArray.length < 1) {
    if (!isHaveFeatureModule && !isHaveArkuiX) {
      console.log('\x1B[31m%s\x1B[0m', `Error: The entered module does not contains an entry or feature type module. cannot be modified`);
      return;
    }
    modifyDesignatedModules(modulesArray, modulesTypeArray);
  } else if (entryTypeArray.length === 1) {
    modifyModulesWithOneEntry(modulesArray, modulesTypeArray, entryTypeArray[0], modifyType.modifyTypeModules);
  } else {
    modifyModulesWithMultiEntry(modulesArray, modulesTypeArray, entryTypeArray, modifyType.modifyTypeModules);
  }
}

function checkNotInProjectModules(modules, modulesArray) {
  let notInProjectModulesStr = '';
  for (let i = 0; i < modules.length; i++) {
    if (!modulesArray.includes(modules[i])) {
      notInProjectModulesStr = `${notInProjectModulesStr},${modules[i]}`;
    }
  }
  if (notInProjectModulesStr !== '') {
    console.log('\x1B[31m%s\x1B[0m', `Error: You entered {${cleanStr(notInProjectModulesStr, ',')}} module is not found in the project. Please confirm!`);
  }
}

function initModifyType() {
  return { modifyTypeProject: 0, modifyTypeModules: 1 };
}

function modifyModulesWithMultiEntry(modulesArray, modulesTypeArray, entryTypeArray, nowModifyType) {
  let entryModuleString = `(`;
  for (const entryModuleNow of entryTypeArray) {
    entryModuleString = (entryModuleNow !== entryTypeArray[entryTypeArray.length - 1]) ? `${entryModuleString}${entryModuleNow} ` : `${entryModuleString}${entryModuleNow}`;
  }
  entryModuleString = `${entryModuleString})`;
  let nowMessage = `You designated modules has more than two entry modules ${entryModuleString}. Please enter a module as the cross-platform entry:`;
  const modifyType = initModifyType();
  if (nowModifyType === modifyType.modifyTypeProject) {
    nowMessage = `The project has more than two entry modules ${entryModuleString}. Please enter a module as the cross-platform entry:`;
  }
  inquirer.prompt([{
    name: 'repair',
    type: 'input',
    message: nowMessage,
    validate(val) {
      if (entryTypeArray.includes(val)) {
        return true;
      } else {
        return `please enter one of ${entryModuleString}:`;
      }
    }
  }]).then(answersModules => {
    modifyModulesWithOneEntry(modulesArray, modulesTypeArray, answersModules.repair, nowModifyType);
  });
}

function modifyModulesWithOneEntry(modulesArray, modulesTypeArray, entryModule, nowModifyType) {
  const modifyModulesArray = [];
  const modifyModulesTypeArray = [];
  modifyModulesArray.push(entryModule);
  modifyModulesTypeArray.push('entry');
  for (let j = 0; j < modulesArray.length; j++) {
    if (modulesTypeArray[j] !== 'entry') {
      modifyModulesArray.push(modulesArray[j]);
      modifyModulesTypeArray.push(modulesTypeArray[j]);
    }
  }
  const modifyType = initModifyType();
  if (nowModifyType === modifyType.modifyTypeProject) {
    modifyProjectModules(modifyModulesArray, modifyModulesTypeArray);
  } else {
    modifyDesignatedModules(modifyModulesArray, modifyModulesTypeArray);
  }
}

function modifyDesignatedModules(modifyModulesArray, modifyModulesTypeArray) {
  let successModuleStr = '';
  let failedModuleStr = '';
  let isHaveSuccess = false;
  let isHaveFailed = false;
  const arkuixModuleArray = [];
  for (let i = 0; i < modifyModulesArray.length; i++) {
    if (copyAndroidiOSTemplate(modifyModulesArray[i], modifyModulesTypeArray[i])) {
      successModuleStr = `${successModuleStr},${modifyModulesArray[i]}`;
      isHaveSuccess = true;
      if (modifyModulesTypeArray[i] === 'entry' || modifyModulesTypeArray[i] === 'feature' || modifyModulesTypeArray[i] === 'shared') {
        arkuixModuleArray.push(modifyModulesArray[i]);
      }
    } else {
      failedModuleStr = `${failedModuleStr},${modifyModulesArray[i]}`;
      isHaveFailed = true;
    }
  }
  if (arkuixModuleArray.length > 0) {
    addModuleInArkuixConfig(arkuixModuleArray);
  }
  checkProblem();
  if (isHaveFailed) {
    console.log('\x1B[31m%s\x1B[0m', `Error: modify HarmonyOS modules {${cleanStr(failedModuleStr, ',')}} to ArkUI-X modules failed!`);
  }
  if (isHaveSuccess) {
    console.log(`modify HarmonyOS modules {${cleanStr(successModuleStr, ',')}} to ArkUI-X modules success!`);
  }
}

module.exports = {modifyModules, modifyProject};
