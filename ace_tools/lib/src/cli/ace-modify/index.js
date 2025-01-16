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

function replaceInfo(files, replaceInfos, strs) {
  for (let i = 0; i < files.length; i++) {
    const data = fs.readFileSync(files[i], 'utf8');
    if (data === undefined) {
      return;
    }
    const lines = data.split('\n');
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].includes(replaceInfos[i])) {
        const newLine = lines[j].replace(replaceInfos[i], strs[i]);
        lines[j] = newLine;
      }
    }
    const newData = lines.join('\n');
    fs.writeFileSync(files[i], newData, 'utf8');
  }
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
  files.push('./.arkui-x/arkui-x-config.json5');
  replaceInfos.push('entry');
  strs.push(moduleName);
  replaceInfo(files, replaceInfos, strs);

  fs.renameSync('./.arkui-x/android/app/src/main/java/MainActivity.java', `./.arkui-x/android/app/src/main/java/${activityName}.java`);
  fs.renameSync('./.arkui-x/ios/app/EntryEntryAbilityViewController.m', `./.arkui-x/ios/app/${nowName}ViewController.m`);
  fs.renameSync('./.arkui-x/ios/app/EntryEntryAbilityViewController.h', `./.arkui-x/ios/app/${nowName}ViewController.h`);
}

function modifyHvigorInfo(moduleName) {
  fs.access('./hvigorfile.ts', fs.constants.F_OK, (err) => {
    if (!err) {
      modifyCopyFileSync(`${globalThis.templatePath}/ohos_stage/hvigorfile.ts`, './hvigorfile.ts');
    }
  });

  fs.access('./hvigor/hvigor-config.json5', fs.constants.F_OK, (err) => {
    if (!err) {
      modifyCopyFileSync(`${globalThis.templatePath}/ohos_stage/hvigor/hvigor-config.json5`, './hvigor/hvigor-config.json5');
    }
  });

  const modulePath = getModulePath(moduleName);
  fs.access(`${modulePath}/hvigorfile.ts`, fs.constants.F_OK, (err) => {
    if (!err) {
      modifyCopyFileSync(`${globalThis.templatePath}/ets_stage/source/entry/hvigorfile.ts`, `${modulePath}/hvigorfile.ts`);
    }
  });
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

function getModuleType(moduleName) {
  const modulePath = getModulePath(moduleName);
  let moduleType = '';
  const moduleJsonPath = `${modulePath}/src/main/module.json5`;
  try {
    fs.accessSync(moduleJsonPath, fs.constants.F_OK);
  } catch (err) {
    console.log(`error: module ${moduleName} is not HarmonyOS module!`);
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
    console.log("warn:arkui-x project must delete the 'useNormalizedOHMUrl' Setting Items in build-profile.json5");
  }
}

function modifyProject() {
  const filePath = './build-profile.json5';
  const data = fs.readFileSync(filePath, 'utf8');
  const jsonObj = JSON5.parse(data);
  for (let i = 0; i < jsonObj.modules.length; i++) {
    copyAndroidiOSTemplate(jsonObj.modules[i].name);
  }
  checkProblem();
  console.log('modify HarmonyOS project to ArkUI-X project success!');
}

function copyAndroidiOSTemplate(moduleName) {
  const type = getModuleType(moduleName);
  if (type === 'entry' || type === 'feature') {
    fs.mkdirSync('.arkui-x');
    modifyCopyFileSync(`${globalThis.templatePath}/arkui-x-config.json5`, './.arkui-x/arkui-x-config.json5');
    modifyCopyFolderSync(`${globalThis.templatePath}/android`, './.arkui-x/android');
    modifyCopyFolderSync(`${globalThis.templatePath}/ios`, './.arkui-x/ios');
    const appName = getAppName();
    const packageName = getPackageName();
    replaceAndroidProjectInfo(appName, packageName);
    replaceiOSProjectInfo(appName);
    modifyCrossModule(moduleName, appName);
    modifyHvigorInfo(moduleName);
    modifyDirStructure(appName);
    return true;
  } else if (type === 'shared') {
    const modulePath = getModulePath(moduleName);
    modifyCopyFileSync(`${globalThis.templatePath}/share_library/hvigorfile.ts`, `${modulePath}/hvigorfile.ts`);
    return true;
  } else if (type === 'har') {
    return true;
  } else {
    return false;
  }
}

function modifyModules(modules) {
  const filePath = './build-profile.json5';
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log('Operation failed. Go to your project directory and try again.');
      return;
    }
  });
  let successModuleStr = '';
  let failedModuleStr = '';
  let isHaveSuccess = false;
  let isHaveFailed = false;
  for (let i = 0; i < modules.length; i++) {
    if (copyAndroidiOSTemplate(modules[i])) {
      successModuleStr = `${successModuleStr},${modules[i]}`;
      isHaveSuccess = true;
    } else {
      failedModuleStr = `${failedModuleStr},${modules[i]}`;
      isHaveFailed = true;
    }
  }
  checkProblem();
  if (isHaveFailed) {
    console.log(`error: modify HarmonyOS modules ${cleanStr(failedModuleStr, ',')} to ArkUI-X modules failed!`);
  }
  if (isHaveSuccess) {
    console.log(`modify HarmonyOS modules ${cleanStr(successModuleStr, ',')} to ArkUI-X modules success!`);
  }
}

module.exports = {modifyModules, modifyProject};
