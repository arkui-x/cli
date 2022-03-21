/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
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

let projectDir;

function checkCurrentDir(currentDir) {
  if (path.basename(currentDir) === 'source') {
    return true;
  }
  return false;
}

function getModuleList() {
  const settingPath = path.join(projectDir, 'ohos/settings.gradle');
  try {
    if (fs.existsSync(settingPath)) {
      const settingStr = fs.readFileSync(settingPath).toString().trim();
      if (settingStr === 'include') {
        console.log(`There is no modules in project.We'll create 'entry' for you.`);
        return 'none';
      }
      const moduleList = settingStr.split(`'`);
      if (moduleList.length % 2 === 0) {
        console.error(`Please check ${settingPath}.`);
        return '';
      } else {
        return moduleList;
      }
    }
  } catch (error) {
    console.error(`Please check ${settingPath}.`);
    return '';
  }
}

function checkModuleName(moduleList, moduleName) {
  if (!moduleName) {
    console.error('Module name must be required!');
    return false;
  }
  const sensitiveWords = ['ohos', 'android', 'source'];
  if (sensitiveWords.includes(moduleName)) {
    console.error('Module name is invalid');
    return false;
  }
  if (!moduleName.match(/^\w+$/)) {
    console.error('The Module name can contain only letters, digits, and underscores(_).');
    return false;
  }
  if (fs.existsSync(path.join(projectDir, 'ohos', moduleName)) ||
        fs.existsSync(path.join(projectDir, 'source', moduleName))) {
    console.error(`${moduleName} already exists.`);
    return false;
  }
  for (let index = 1; index < moduleList.length - 1; index++) {
    const moduleItem = moduleList[index].slice(1, moduleList[index].length);
    if (moduleItem === moduleName) {
      console.error(`${moduleName} already exists.`);
      return false;
    }
  }
  return true;
}

function createInSource(moduleName, templateDir) {
  const src = path.join(templateDir, 'app/source/entry/default');
  const dist = path.join(projectDir, 'source', moduleName, 'default/');
  const jsonSrc = path.join(templateDir, 'app/source/entry/manifest.json');
  const jsonDist = path.join(projectDir, 'source', moduleName, 'manifest.json');
  try {
    fs.mkdirSync(dist, { recursive: true });
    fs.copyFileSync(jsonSrc, jsonDist);
    return copy(src, dist);
  } catch (error) {
    console.error('Error occurs when create in source.');
    return false;
  }
}

function createInOhos(moduleName, templateDir) {
  let src;
  const dist = path.join(projectDir, `ohos/${moduleName}/`);
  if (moduleName === 'entry') {
    src = path.join(templateDir, 'app/ohos/entry');
  } else {
    src = path.join(templateDir, 'module_ohos');
  }
  try {
    fs.mkdirSync(dist, { recursive: true });
    return copy(src, dist);
  } catch (error) {
    console.error('Error occurs when create in ohos');
    return false;
  }
}

function createInAndroid(moduleName, templateDir) {
  const dist = path.join(projectDir, `android/${moduleName}/`);
  let src;
  if (moduleName === 'entry') {
    src = path.join(templateDir, 'app/android/app');
  } else {
    src = path.join(templateDir, 'module_android');
  }
  try {
    fs.mkdirSync(dist, { recursive: true });
    return copy(src, dist);
  } catch (error) {
    console.error('Error occurs when create in android');
    return false;
  }
}

function replaceInOhos(moduleName, appName, packageName, bundleName) {
  const stringJsonPath = path.join(projectDir, 'ohos', moduleName, 'src/main/resources/base/element/string.json');
  fs.writeFileSync(stringJsonPath,
    fs.readFileSync(stringJsonPath).toString().replace('appName', appName));

  const moduleJsonPath = path.join(projectDir, 'ohos', moduleName, 'src/main/config.json');
  const moduleJsonObj = JSON.parse(fs.readFileSync(moduleJsonPath));
  moduleJsonObj.app.bundleName = bundleName;
  moduleJsonObj.module.package = packageName;
  moduleJsonObj.module.distro.moduleName = moduleName;
  moduleJsonObj.module.abilities[0].label = appName;
  fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJsonObj, '', '  '));

  if (moduleName === 'entry') {
    const testJsonPath = path.join(projectDir, 'ohos', moduleName, 'src/ohosTest/config.json');
    const testJsonObj = JSON.parse(fs.readFileSync(testJsonPath));
    testJsonObj.module.bundleName = bundleName;
    testJsonObj.module.package = packageName;
    testJsonObj.module.distro.moduleName = moduleName + '_test';
    fs.writeFileSync(testJsonPath, JSON.stringify(testJsonObj, '', '  '));
  }

  const abilityOhosSrc = path.join(projectDir, 'ohos', moduleName, 'src/main/java/MainAbility.java');
  const applicationOhosSrc = path.join(projectDir, 'ohos', moduleName, 'src/main/java/MyApplication.java');

  const javaSrcList = [abilityOhosSrc, applicationOhosSrc];
  replaceJava(javaSrcList, packageName);

  const ohosGradlePath = path.join(projectDir, 'ohos/settings.gradle');
  const ohosGradleStr = fs.readFileSync(ohosGradlePath).toString().replace('\r\n', '').replace('\n', '');
  fs.writeFileSync(ohosGradlePath, ohosGradleStr + `, ':${moduleName}'`);
}

function replaceInAndroid(moduleName, appName, packageName) {
  if (moduleName === 'entry') {
    moduleName = 'app';

    const stringXmlPath = path.join(projectDir, 'android', moduleName, 'src/main/res/values/strings.xml');
    fs.writeFileSync(stringXmlPath,
      fs.readFileSync(stringXmlPath).toString().replace('appName', appName));

    const abilityAndroidSrc = path.join(projectDir, 'android', moduleName, 'src/main/java/HiHelloWorldActivity.java');
    const applicationAndroidSrc = path.join(projectDir, 'android', moduleName, 'src/main/java/HiHelloWorldApplication.java');

    const unitTestPathSrc = path.join(projectDir, 'android', moduleName, 'src/test/java/ExampleUnitTest.java');
    const exampleTestPathSrc = path.join(projectDir, 'android', moduleName, 'src/androidTest/java/ExampleInstrumentedTest.java');

    const javaSrcList = [abilityAndroidSrc, applicationAndroidSrc, unitTestPathSrc, exampleTestPathSrc];
    replaceJava(javaSrcList, packageName);
  } else {
    const gradlePath = path.join(projectDir, 'android/app/build.gradle');
    const gradleStr = fs.readFileSync(gradlePath, 'utf-8').trim().split('\n');
    for (let index = 0; index < gradleStr.length; index++) {
      if (gradleStr[index].includes('dynamicFeatures')) {
        if (gradleStr[index].includes('[]')) {
          gradleStr[index] = gradleStr[index].replace(']', `':${moduleName}']`);
        } else {
          gradleStr[index] = gradleStr[index].replace(']', `, ':${moduleName}']`);
        }
        fs.writeFileSync(gradlePath, gradleStr.join('\n'));
        break;
      }
    }

    const stringXmlPath = path.join(projectDir, 'android/app/src/main/res/values/strings.xml');
    let stringXml = fs.readFileSync(stringXmlPath).toString();
    const strFlag = `<string name="app_name">${appName}</string>`;
    stringXml = stringXml.replace(strFlag, strFlag + '\n' + strFlag.replace('app_name', `title_${moduleName.toLowerCase()}`)
      .replace(`${appName}`, moduleName));
    fs.writeFileSync(stringXmlPath, stringXml);

    const featureActivitySrc = path.join(projectDir, 'android', moduleName, 'src/main/java/FeatureActivity.java');

    const unitTestPathSrc = path.join(projectDir, 'android', moduleName, 'src/test/java/ExampleUnitTest.java');
    const exampleTestPathSrc = path.join(projectDir, 'android', moduleName, 'src/androidTest/java/ExampleInstrumentedTest.java');

    const javaSrcList = [featureActivitySrc, unitTestPathSrc, exampleTestPathSrc];
    replaceJava(javaSrcList, packageName);
  }

  const moduleXmlPath = path.join(projectDir, 'android', moduleName, 'src/main/AndroidManifest.xml');
  fs.writeFileSync(moduleXmlPath,
    fs.readFileSync(moduleXmlPath).toString().replace('packageName', packageName).replace('moduleName', moduleName.toLowerCase()));

  const gradlePath = path.join(projectDir, 'android', moduleName, 'build.gradle');
  fs.writeFileSync(gradlePath,
    fs.readFileSync(gradlePath).toString().replace('packageName', packageName));

  const androidGradlePath = path.join(projectDir, 'android/settings.gradle');
  const androidGradleStr = fs.readFileSync(androidGradlePath).toString().replace('appName', appName);
  fs.writeFileSync(androidGradlePath, `include ':${moduleName}'\n` + androidGradleStr);
}

function replaceJava(javaSrcList, packageName) {
  const packageInfo = packageName.split('.');
  javaSrcList.forEach(javaSrc => {
    let JavaDir = path.dirname(javaSrc);
    packageInfo.forEach(element => {
      JavaDir = path.join(JavaDir, element);
    });
    fs.mkdirSync(JavaDir, { recursive: true });
    fs.writeFileSync(path.join(JavaDir, path.basename(javaSrc)),
      fs.readFileSync(javaSrc).toString().replace('package packageName', `package ${packageName}`));
    fs.unlinkSync(javaSrc);
  });
}

function replaceProjectInfo(moduleName) {
  try {
    const packageName = 'com.example.' + moduleName.toLowerCase();
    let appName;

    if (moduleName !== 'entry') {
      const entryJsonPath = path.join(projectDir, 'ohos/entry/src/main/config.json');
      const entryJsonObj = JSON.parse(fs.readFileSync(entryJsonPath));
      appName = entryJsonObj.module.abilities[0].label;
    } else {
      appName = projectDir.split('/').pop();
    }
    const bundleName = 'com.example.' + appName.toLowerCase();

    const jsonPath = path.join(projectDir, 'source', moduleName, 'manifest.json');
    const jsonObj = JSON.parse(fs.readFileSync(jsonPath));
    jsonObj.appID = bundleName;
    jsonObj.appName = appName;
    fs.writeFileSync(jsonPath, JSON.stringify(jsonObj, '', '  '));

    replaceInOhos(moduleName, appName, packageName, bundleName);

    replaceInAndroid(moduleName, appName, packageName);

    return true;
  } catch (error) {
    console.error('Replace project info error.');
    return false;
  }
}

function createModule() {
  if (!checkCurrentDir(process.cwd())) {
    console.error(`Please go to ${path.join(process.cwd(), 'source')} and create module again.`);
    return false;
  }
  projectDir = path.join(process.cwd(), '..');

  let templateDir = path.join(__dirname, '../../../templates');
  if (!fs.existsSync(templateDir)) {
    templateDir = path.join(__dirname, 'template');
  }
  const moduleList = getModuleList();
  if (!moduleList) {
    console.error('Create module failed');
    return false;
  } else if (moduleList === 'none') {
    console.log(moduleList);
    if (createInSource('entry', templateDir) &&
            createInOhos('entry', templateDir) &&
            createInAndroid('entry', templateDir)) {
      return replaceProjectInfo('entry');
    }
  } else {
    const question = [{
      name: 'moduleName',
      type: 'input',
      message: 'Please enter the module name:',
      validate(val) {
        return checkModuleName(moduleList, val);
      }
    }];
    inquirer.prompt(question).then(answers => {
      if (createInSource(answers.moduleName, templateDir) &&
                createInOhos(answers.moduleName, templateDir) &&
                createInAndroid(answers.moduleName, templateDir)) {
        return replaceProjectInfo(answers.moduleName);
      }
    });
  }
}

module.exports = createModule;
