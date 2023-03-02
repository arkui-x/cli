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
const { copy } = require('../project');
const { getModuleList, getModuleAbilityList, isStageProject } = require('../../util');

let projectDir;

function checkAbilityName(abilityName, abilityList, moduleName) {
  if (!abilityName) {
    console.error('abilityName name is required!');
    return false;
  }
  if (abilityList.includes(moduleName + '_' + abilityName)) {
    console.error('abilityName name already exists!');
    return false;
  }
  return true;
}

function checkActivityNameExist(fileNames, checkActivityName) {
  let existFlag = false;
  fileNames.forEach((fileName) => {
    if (fileName == checkActivityName) {
      existFlag = true;
    }
  });
  return existFlag;
}

function getNextAndroidActivityName(srcPath) {
  const startIndex = 2;
  const defaultName = 'MainActivity';
  const suffix = '.java';
  const fileNames = fs.readdirSync(srcPath);
  let index = startIndex;
  let activityName = defaultName + String(index) + suffix;

  while (checkActivityNameExist(fileNames, activityName)) {
    index++;
    activityName = defaultName + String(index) + suffix;
  }
  return defaultName + String(index);
}

function createStageAbilityInAndroid(moduleName, templateDir) {
  try {
    const manifestPath = path.join(projectDir, '../../ohos/AppScope/app.json5');
    const manifestJsonObj = JSON.parse(fs.readFileSync(manifestPath));
    const packageArray = manifestJsonObj.app.bundleName.split('.');
    const aceVersion = 'VERSION_ETS';
    const src = path.join(templateDir, 'android/app/src/main/java');
    const templateFileName = 'MainActivity.java';
    let dest = path.join(projectDir, '../../android/app/src/main/java');
    packageArray.forEach(pkg => {
      dest = path.join(dest, pkg);
    });
    const srcFile = path.join(src, templateFileName);
    const destClassName = getNextAndroidActivityName(dest);
    const destFileName = destClassName + '.java';
    const destFilePath = path.join(dest, destFileName);
    fs.writeFileSync(destFilePath, fs.readFileSync(srcFile));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('MainActivity', 'g'), destClassName));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ArkUIInstanceName', 'g'),
        moduleName));
    fs.writeFileSync(destFilePath,
      fs.readFileSync(destFilePath).toString().replace(new RegExp('ACE_VERSION', 'g'), aceVersion));
    const createActivityXmlInfo =
      '    <activity \n' +
      '            android:name=".' + destClassName + '"\n' +
      '        android:exported="false" />\n    ';
    const curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, '../../android/app/src/main/AndroidManifest.xml')).toString();
    const insertIndex = curManifestXmlInfo.lastIndexOf('</application>');
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertIndex) +
      createActivityXmlInfo +
      curManifestXmlInfo.slice(insertIndex);
    fs.writeFileSync(path.join(projectDir, '../../android/app/src/main/AndroidManifest.xml'), updateManifestXmlInfo);
    return true;
  } catch (error) {
    console.error('Get package name error.');
    return false;
  }
}

function updateManifest(abilityName) {
  try {
    const newTsFilePath = path.join(projectDir, 'src/main/ets', abilityName, abilityName + '.ts');
    fs.renameSync(path.join(projectDir, 'src/main/ets', abilityName, 'MainAbility.ts'), newTsFilePath);
    let content = fs.readFileSync(newTsFilePath, 'utf8');
    content = content.replace(/MainAbility/g, abilityName);
    fs.writeFileSync(newTsFilePath, content);
    const resourceStringPath = path.join(projectDir, 'src/main/resources/base/element/string.json');
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
    fs.writeFileSync(resourceStringPath, JSON.stringify(resourceStringJson, '', '  '));
    const moduleJsonPath = path.join(projectDir, 'src/main/module.json5');
    const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath));
    moduleJson.module.abilities.push(
      {
        name: abilityName,
        srcEntrance: './ets/' + abilityName + '/' + abilityName + '.ts',
        description: '$string:' + abilityName + '_desc',
        icon: '$media:icon',
        label: '$string:' + abilityName + '_label',
        startWindowIcon: '$media:icon',
        startWindowBackground: '$color:white',
        visible: true
      }
    );
    fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, '', '  '));
    return true;
  } catch (error) {
    console.error('Replace ability info error.');
    return false;
  }
}

function createStageAbilityInIOS(moduleName, moduleList) {
  const iosFilePath = path.join(projectDir, '../../ios/app/AppDelegate.mm');
  if (!fs.existsSync(iosFilePath)) {
    console.error('Create module failed');
    return false;
  }
  let fileContent = fs.readFileSync(iosFilePath, 'utf8');
  const keyword = '[[AceViewController alloc] initWithVersion:(ACE_VERSION_ETS) instanceName:@"' +
      moduleList[moduleList.length - 1] + '"];\n';
  const index = fileContent.indexOf(keyword);
  const newLine = '    AceViewController *controller' +
      (moduleList.length + 1) +
      ' = [[AceViewController alloc] initWithVersion:(ACE_VERSION_ETS) instanceName:@"' +
      moduleName + '"];\n';
  fileContent = fileContent.slice(0, index + keyword.length) + newLine + fileContent.slice(index + keyword.length);
  fs.writeFileSync(iosFilePath, fileContent, 'utf8');
  return true;
}

function getTemplatePath() {
  let templateDir = path.join(__dirname, '../../../templates');
  if (!fs.existsSync(templateDir)) {
    templateDir = path.join(__dirname, 'template');
  }
  templateDir = path.join(templateDir, 'ets_stage/source/entry/src/main/ets/MainAbility');
  return templateDir;
}

function createInSource(abilityName, templateDir) {
  const dist = path.join(projectDir, 'src/main/ets', abilityName);
  try {
    fs.mkdirSync(dist, { recursive: true });
    return copy(templateDir, dist);
  } catch (error) {
    console.error('Error occurs when creating in source.');
    return false;
  }
}

function createAbility() {
  projectDir = process.cwd();
  const buildFilePath = path.join(projectDir, '../../ohos/build-profile.json5');
  if (!fs.existsSync(buildFilePath)) {
    console.error(`Please go to your ${path.join('projectName', 'source', 'ModuleName')} and create ability again.`);
    return false;
  }
  const moduleListForAbility = getModuleList(buildFilePath);
  if (!moduleListForAbility.includes(path.basename(projectDir))) {
    console.error(`Please go to your ${path.join('projectName', 'source', 'ModuleName')} and create ability again.`);
    return false;
  }
  if (!isStageProject(path.join(projectDir, '../../source'))) {
    console.error('The Project is not stage Module');
    return false;
  }
  const templateDir = getTemplatePath(projectDir);
  const moduleAbilityList = getModuleAbilityList(path.join(projectDir, '../../'), moduleListForAbility);
  const question = [{
    name: 'abilityName',
    type: 'input',
    message: 'Please enter the ability name:',
    validate(val) {
      return checkAbilityName(val, moduleAbilityList, path.basename(projectDir));
    }
  }];
  inquirer.prompt(question).then(answers => {
    if (createInSource(answers.abilityName, templateDir) &&
    updateManifest(answers.abilityName) &&
    createStageAbilityInAndroid(path.basename(projectDir) + '_' + answers.abilityName,
      path.join(templateDir, '../../../../../../../')) &&
      createStageAbilityInIOS(path.basename(projectDir) + '_' + answers.abilityName, moduleAbilityList)) {
      return true;
    }
  });
}

module.exports = createAbility;
