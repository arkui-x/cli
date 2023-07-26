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
const { copy } = require('../util');
const { getModuleList, getModuleAbilityList, addFileToPbxproj, isAppProject } = require('../../util');

let currentDir;

function checkAbilityName(abilityName, abilityList, moduleName) {
  if (!abilityName) {
    console.error('abilityName name is required!');
    return false;
  }
  if (abilityList.includes(moduleName + '_' + abilityName + 'Ability')) {
    console.error('abilityName name already exists!');
    return false;
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
  if (!isAppProject(path.join(currentDir, '../'))) {
    console.warn('aar and framework not support multiple abilities.');
    return true;
  }
  try {
    const manifestPath = path.join(currentDir, '../AppScope/app.json5');
    const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
    const packageArray = manifestJsonObj.app.bundleName.split('.');
    const src = path.join(templateDir, 'android/app/src/main/java');
    const templateFileName = 'MainActivity.java';
    let dest = path.join(currentDir, '../.arkui-x/android/app/src/main/java');
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
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ohos.ace.adapter.AceActivity', 'g'),
        'ohos.stage.ability.adapter.StageActivity'));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('AceActivity', 'g'), 'StageActivity'));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ArkUIInstanceName', 'g'),
        manifestJsonObj.app.bundleName + ':' + moduleName + ':' + abilityName + ':'));
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
    return true;
  } catch (error) {
    console.error('Get package name error.');
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
        value: 'description'
      },
      {
        name: abilityName + '_label',
        value: 'label'
      }
    );
    const resourceEnStringPath = path.join(currentDir, 'src/main/resources/en_US/element/string.json');
    const resourceEnStringJson = JSON.parse(fs.readFileSync(resourceEnStringPath));
    resourceEnStringJson.string.push(
      {
        name: abilityName + '_desc',
        value: 'description'
      },
      {
        name: abilityName + '_label',
        value: 'label'
      }
    );
    fs.writeFileSync(resourceEnStringPath, JSON.stringify(resourceEnStringJson, '', '  '));
    const resourceZhStringPath = path.join(currentDir, 'src/main/resources/zh_CN/element/string.json');
    const resourceZhStringJson = JSON.parse(fs.readFileSync(resourceZhStringPath));
    resourceZhStringJson.string.push(
      {
        name: abilityName + '_desc',
        value: 'description'
      },
      {
        name: abilityName + '_label',
        value: 'label'
      }
    );
    fs.writeFileSync(resourceZhStringPath, JSON.stringify(resourceZhStringJson, '', '  '));
    return true;
  } catch (error) {
    console.error('Replace ability info error.');
    return false;
  }
}

function updateManifest(abilityName) {
  try {
    const newTsFilePath = path.join(currentDir, 'src/main/ets', abilityName, abilityName + '.ets');
    fs.renameSync(path.join(currentDir, 'src/main/ets', abilityName, 'EntryAbility.ets'), newTsFilePath);
    let content = fs.readFileSync(newTsFilePath, 'utf8');
    content = content.replace(/EntryAbility/g, abilityName);
    fs.writeFileSync(newTsFilePath, content);
    if (!replaceResourceJson(abilityName)) {
      console.error('Replace resource info error.');
      return false;
    }
    const moduleJsonPath = path.join(currentDir, 'src/main/module.json5');
    const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath));
    moduleJson.module.abilities.push(
      {
        name: abilityName,
        srcEntry: './ets/' + abilityName + '/' + abilityName + '.ets',
        description: '$string:' + abilityName + '_desc',
        icon: '$media:icon',
        label: '$string:' + abilityName + '_label',
        startWindowIcon: '$media:icon',
        startWindowBackground: '$color:start_window_background'
      }
    );
    fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, '', '  '));
    return true;
  } catch (error) {
    console.error('Replace ability info error.');
    return false;
  }
}

function createStageAbilityInIOS(moduleName, abilityName, templateDir, currentDir) {
  if (!isAppProject(path.join(currentDir, '../'))) {
    return true;
  }
  try {
    const destClassName = moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + abilityName.replace('Ability', '') + 'ViewController';
    const srcFilePath = path.join(templateDir, 'ios/etsapp/EntryMainViewController');
    fs.writeFileSync(path.join(currentDir, '../.arkui-x/ios/app/' + destClassName + '.h'),
      fs.readFileSync(srcFilePath + '.h').toString().replace(new RegExp('EntryMainViewController', 'g'),
        destClassName));
    fs.writeFileSync(path.join(currentDir, '../.arkui-x/ios/app/' + destClassName + '.m'),
      fs.readFileSync(srcFilePath + '.m').toString().replace(new RegExp('EntryMainViewController', 'g'),
        destClassName));
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
    const curManifestXmlInfo =
      fs.readFileSync(path.join(currentDir, '../.arkui-x/ios/app/AppDelegate.m')).toString();
    const insertIndex = curManifestXmlInfo.lastIndexOf('} // other ViewController');
    const insertImportIndex = curManifestXmlInfo.lastIndexOf('#import "EntryMainViewController.h"');
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertImportIndex) +
    '#import "' + destClassName + '.h"\n' +
    curManifestXmlInfo.slice(insertImportIndex, insertIndex) +
    createViewControlInfo +
      curManifestXmlInfo.slice(insertIndex + 26);
    fs.writeFileSync(path.join(currentDir, '../.arkui-x/ios/app/AppDelegate.m'), updateManifestXmlInfo);
    const pbxprojFilePath = path.join(currentDir, '../.arkui-x/ios/app.xcodeproj/project.pbxproj');
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

function getTemplatePath() {
  let templateDir = path.join(__dirname, '../../../templates');
  if (!fs.existsSync(templateDir)) {
    templateDir = path.join(__dirname, 'template');
  }
  templateDir = path.join(templateDir, 'ets_stage/source/entry/src/main/ets/entryability');
  return templateDir;
}

function createInSource(abilityName, templateDir) {
  const dist = path.join(currentDir, 'src/main/ets', abilityName);
  try {
    fs.mkdirSync(dist, { recursive: true });
    return copy(templateDir, dist);
  } catch (error) {
    console.error('Error occurs when creating in source.');
    return false;
  }
}

function createAbility() {
  currentDir = process.cwd(); //it should be module directory
  const buildFilePath = path.join(currentDir, '../build-profile.json5');
  if (!fs.existsSync(buildFilePath)) {
    console.error(`Please go to your module directory and create ability again.`);
    return false;
  }
  const moduleListForAbility = getModuleList(buildFilePath);
  if (moduleListForAbility === null) {
    return false;
  }
  const templateDir = getTemplatePath();
  const moduleAbilityList = getModuleAbilityList(path.join(currentDir,'../'), moduleListForAbility);
  const question = [{
    name: 'abilityName',
    type: 'input',
    message: 'Please enter the ability name:',
    validate(val) {
      if (!isAbilityNameQualified(val)) {
        console.log('The ability name must contain 1 to 50 characters, start with a letter,' +
          ' and include only letters, digits and underscores (_)');
        return false;
      }
      return checkAbilityName(val, moduleAbilityList, path.basename(currentDir));
    }
  }];
  inquirer.prompt(question).then(answers => {
    if (createInSource(answers.abilityName + 'Ability', templateDir) &&
    updateManifest(answers.abilityName + 'Ability') &&
    createStageAbilityInAndroid(path.basename(currentDir), answers.abilityName + 'Ability',
      path.join(templateDir, '../../../../../../../'), currentDir) &&
      createStageAbilityInIOS(path.basename(currentDir), answers.abilityName + 'Ability',
        path.join(templateDir, '../../../../../../../'), currentDir)) {
      return true;
    }
  });
}

module.exports = { createAbility, createStageAbilityInAndroid, createStageAbilityInIOS };
