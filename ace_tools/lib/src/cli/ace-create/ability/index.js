/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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
const { copy } = require('../util');
const { getModuleAbilityList, addFileToPbxproj, isAppProject,
  getCrossPlatformModules, getIosProjectName } = require('../../util');

let currentDir;

function checkAbilityName(abilityName, abilityList, moduleName) {
  if (!abilityName) {
    console.error('\n abilityName is required!');
    return false;
  }

  for (let index = 0; index < abilityList.length; index++) {
    if (abilityList[index].toLowerCase() === (moduleName + '_' + abilityName + 'Ability').toLowerCase()) {
      console.error('\n The ability name already exists.');
      return false;
    }
  }
  return true;
}

function isAbilityNameQualified(name) {
  const regEn = /[`~!@#$%^&*()+<>?:"{},.\/;'\\[\]]/im;
  const regCn = /[·！#￥（——）：；“”‘、，|《。》？、【】[\]]/im;

  if (regEn.test(name) || regCn.test(name) || !isNaN(name[0]) || name.length > 50) {
    return false;
  } else if (name[0] === '_') {
    return false;
  }
  return true;
}

function createStageAbilityInAndroid(moduleName, abilityName, templateDir, currentDir) {
  let destDir = 'app';
  if (!isAppProject(path.join(currentDir, '../'))) {
    destDir = 'library';
  }
  try {
    const manifestPath = path.join(currentDir, '../AppScope/app.json5');
    const manifestJsonObj = JSON5.parse(fs.readFileSync(manifestPath));
    const packageArray = manifestJsonObj.app.bundleName.split('.');
    const src = path.join(templateDir, 'android/app/src/main/java');
    const templateFileName = 'MainActivity.java';
    let dest = path.join(currentDir, `../.arkui-x/android/${destDir}/src/main/java`);
    packageArray.forEach(pkg => {
      dest = path.join(dest, pkg);
    });
    const srcFile = path.join(src, templateFileName);
    const destClassName = moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + abilityName + 'Activity';
    const destFileName = destClassName + '.java';
    const destFilePath = path.join(dest, destFileName);
    fs.writeFileSync(destFilePath, fs.readFileSync(srcFile));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('MainActivity', 'g'), destClassName));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('packageName', 'g'), manifestJsonObj.app.bundleName));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ArkUIInstanceName', 'g'),
        manifestJsonObj.app.bundleName + ':' + moduleName + ':' + abilityName + ':'));
    if (isAppProject(path.join(currentDir, '../')) && fs.existsSync(path.join(dest, 'EntryEntryAbilityActivity.java'))) {
      const createActivityXmlInfo =
        '    <activity \n' +
        '            android:name=".' + destClassName + '"\n' +
        '        android:exported="true" android:configChanges="uiMode|orientation|screenSize|density" />\n    ';
      const curManifestXmlInfo =
        fs.readFileSync(path.join(currentDir, '../.arkui-x/android/app/src/main/AndroidManifest.xml')).toString();
      const insertIndex = curManifestXmlInfo.lastIndexOf('</application>');
      const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertIndex) +
        createActivityXmlInfo +
        curManifestXmlInfo.slice(insertIndex);
      fs.writeFileSync(path.join(currentDir, '../.arkui-x/android/app/src/main/AndroidManifest.xml'), updateManifestXmlInfo);
    }
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Get package name error.');
    return false;
  }
}

function replaceResourceJson(abilityName) {
  try {
    const resourceStringPath = path.join(currentDir, 'src/main/resources/base/element/string.json');
    const resourceStringJson = JSON.parse(fs.readFileSync(resourceStringPath));
    resourceStringJson.string.push(
      {
        name: abilityName + '_desc',
        value: 'description',
      },
      {
        name: abilityName + '_label',
        value: 'label',
      }
    );
    const resourceEnStringPath = path.join(currentDir, 'src/main/resources/en_US/element/string.json');
    const resourceEnStringJson = JSON.parse(fs.readFileSync(resourceEnStringPath));
    resourceEnStringJson.string.push(
      {
        name: abilityName + '_desc',
        value: 'description',
      },
      {
        name: abilityName + '_label',
        value: 'label',
      }
    );
    fs.writeFileSync(resourceEnStringPath, JSON.stringify(resourceEnStringJson, '', '  '));
    const resourceZhStringPath = path.join(currentDir, 'src/main/resources/zh_CN/element/string.json');
    const resourceZhStringJson = JSON.parse(fs.readFileSync(resourceZhStringPath));
    resourceZhStringJson.string.push(
      {
        name: abilityName + '_desc',
        value: 'description',
      },
      {
        name: abilityName + '_label',
        value: 'label',
      }
    );
    fs.writeFileSync(resourceZhStringPath, JSON.stringify(resourceZhStringJson, '', '  '));
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Replace ability info error.');
    return false;
  }
}

function updateManifest(abilityName) {
  try {
    const newTsFilePath = path.join(currentDir, 'src/main/ets', abilityName, `${abilityName}.ets`);
    fs.renameSync(path.join(currentDir, 'src/main/ets', abilityName, 'EntryAbility.ets'), newTsFilePath);
    let content = fs.readFileSync(newTsFilePath, 'utf8');
    content = content.replace(/EntryAbility/g, abilityName);
    fs.writeFileSync(newTsFilePath, content);
    if (!replaceResourceJson(abilityName)) {
      console.error('\x1B[31m%s\x1B[0m', 'Replace resource info error.');
      return false;
    }
    const moduleJsonPath = path.join(currentDir, 'src/main/module.json5');
    const moduleJson = JSON5.parse(fs.readFileSync(moduleJsonPath));
    moduleJson.module.abilities.push(
      {
        name: abilityName,
        srcEntry: './ets/' + abilityName + '/' + abilityName + '.ets',
        description: '$string:' + abilityName + '_desc',
        icon: '$media:icon',
        label: '$string:' + abilityName + '_label',
        startWindowIcon: '$media:icon',
        startWindowBackground: '$color:start_window_background',
      }
    );
    fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, '', '  '));
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Replace ability info error.');
    return false;
  }
}

function createStageAbilityInIOS(moduleName, abilityName, templateDir, currentDir) {
  try {
    const iosPath = getIosProjectName(path.join(currentDir, '../'));
    const destClassName = moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + abilityName + 'ViewController';
    const srcFilePath = path.join(templateDir, 'ios/app/EntryEntryAbilityViewController');
    fs.writeFileSync(path.join(currentDir, `../.arkui-x/ios/${iosPath}/` + destClassName + '.h'),
      fs.readFileSync(srcFilePath + '.h').toString().replace(new RegExp('EntryEntryAbilityViewController', 'g'),
        destClassName));
    fs.writeFileSync(path.join(currentDir, `../.arkui-x/ios/${iosPath}/` + destClassName + '.m'),
      fs.readFileSync(srcFilePath + '.m').toString().replace(new RegExp('EntryEntryAbilityViewController', 'g'),
        destClassName));
    if (iosPath === 'app' || iosPath === 'myframework') {
      const createViewControlInfo =
        '} else if ([moduleName isEqualToString:@"' + moduleName + '"] && [abilityName ' +
        'isEqualToString:@"' + abilityName + '"]) {\n' +
        '        NSString *instanceName = [NSString stringWithFormat:@"%@:%@:%@",bundleName, ' +
        'moduleName, abilityName];\n' +
        '        ' + destClassName + ' *entryOtherVC = [[' + destClassName + ' alloc] ' +
        'initWithInstanceName:instanceName];\n' +
        '        entryOtherVC.params = params;\n' +
        '        subStageVC = (' + destClassName + ' *)entryOtherVC;\n' +
        '    } // other ViewController\n';

      let delegateFile;
      if (iosPath === 'myframework') {
        delegateFile = path.join(currentDir, `../.arkui-x/ios/${iosPath}/ArkUIAppDelegate.m`);
      } else {
        delegateFile = path.join(currentDir, `../.arkui-x/ios/${iosPath}/AppDelegate.m`);
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
    const pbxprojFilePath = path.join(currentDir, `../.arkui-x/ios/${iosPath}.xcodeproj/project.pbxproj`);
    if (!addFileToPbxproj(pbxprojFilePath, destClassName + '.h', 'headfile') ||
      !addFileToPbxproj(pbxprojFilePath, destClassName + '.m', 'sourcefile')) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Error occurs when create in ios', error);
    return false;
  }
}

function createInSource(abilityName, templateDir) {
  const dist = path.join(currentDir, 'src/main/ets', abilityName);
  try {
    fs.mkdirSync(dist, { recursive: true });
    return copy(path.join(templateDir, 'ets_stage/source/entry/src/main/ets/entryability'), dist);
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'Error occurs when creating in source.');
    return false;
  }
}

function getCurrentModuleName(currentDir) {
  const ohPackage = path.join(currentDir, 'oh-package.json5');
  return JSON5.parse(fs.readFileSync(ohPackage)).name;
}

function createAbility() {
  currentDir = process.cwd(); // it should be module directory
  const abilityCreateInfo = {};
  const buildFilePath = path.join(currentDir, 'obfuscation-rules.txt');
  if (!fs.existsSync(buildFilePath)) {
    console.error('\x1B[31m%s\x1B[0m', `Operation failed. Go to your module directory and try again.`);
    return false;
  }

  if (fs.readFileSync(path.join(currentDir, 'hvigorfile.ts')).toString().includes('hspTasks')) {
    console.error('\x1B[31m%s\x1B[0m', `Share Library not support to create ability.`);
    return false;
  }

  const templateDir = globalThis.templatePath;
  const moduleName = getCurrentModuleName(currentDir);
  const moduleAbilityList = getModuleAbilityList(path.join(currentDir, '../'), moduleName);
  const crossPlatformModules = getCrossPlatformModules(path.join(currentDir, '../'));
  const question = [{
    name: 'abilityName',
    type: 'input',
    message: 'Enter the ability name:',
    validate(val) {
      if (!isAbilityNameQualified(val)) {
        console.log('The ability name must contain 1 to 50 characters, start with a letter,' +
          ' and include only letters, digits and underscores (_)');
        return false;
      }
      return checkAbilityName(val, moduleAbilityList, moduleName);
    },
  }];
  inquirer.prompt(question).then(answers => {
    abilityCreateInfo.abilityModuleName = moduleName;
    abilityCreateInfo.abilityName = answers.abilityName;
    const infoJson = JSON.parse(fs.readFileSync(path.join(path.dirname(currentDir), '.projectInfo'), 'utf8'));
    if (createInSource(answers.abilityName + 'Ability', templateDir) &&
      updateManifest(answers.abilityName + 'Ability')) {
      abilityCreateInfo.abilityModuleCrossPlatform = 'n';
      if (crossPlatformModules.includes(moduleName)) {
        abilityCreateInfo.abilityModuleCrossPlatform = 'y';
        createStageAbilityInAndroid(moduleName, answers.abilityName + 'Ability', templateDir, currentDir) &&
          createStageAbilityInIOS(moduleName, answers.abilityName + 'Ability', templateDir, currentDir);
      }
      infoJson.abilityInfo.push(abilityCreateInfo);
      fs.writeFileSync(path.join(path.dirname(currentDir), '.projectInfo'), JSON.stringify(infoJson, '', '  '), 'utf8');
      return true;
    }
  });
}

function repairAbility(templateDir, absolutePath, projectTempPath) {
  const readAbilityInfo = JSON.parse(fs.readFileSync(path.join(absolutePath, '.projectInfo'), 'utf8'));
  readAbilityInfo.abilityInfo.forEach((ability) => {
    currentDir = path.join(projectTempPath, ability.abilityModuleName);
    if (createInSource(ability.abilityName + 'Ability', templateDir) &&
      updateManifest(ability.abilityName + 'Ability')) {
      if (ability.abilityModuleCrossPlatform === 'y') {
        createStageAbilityInAndroid(ability.abilityModuleName, ability.abilityName + 'Ability', templateDir, currentDir) &&
          createStageAbilityInIOS(ability.abilityModuleName, ability.abilityName + 'Ability', templateDir, currentDir);
      }
    }
  });
  return;
}

module.exports = { createAbility, createStageAbilityInAndroid, createStageAbilityInIOS, repairAbility };
