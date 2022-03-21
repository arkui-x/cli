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

function checkCurrentDir(projectDir) {
  try {
    const moduleListForComponent = getModuleList();
    if (moduleListForComponent.includes(path.basename(projectDir))) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

function getComponentList(manifestFile) {
  const componentList = [];
  manifestFile.js.forEach(component => {
    componentList.push(component['name']);
  });
  return componentList;
}

function getModuleList() {
  const moduleListForComponent = [];
  const settingPath = path.join(projectDir, '../../ohos/settings.gradle');
  try {
    if (fs.existsSync(settingPath)) {
      let settingStr = fs.readFileSync(settingPath).toString().trim();
      if (settingStr === 'include') {
        console.error(`There is no modules in project.`);
        return false;
      }
      settingStr = settingStr.split(`'`);
      if (settingStr.length % 2 === 0) {
        console.error(`Please check ${settingPath}.`);
        return false;
      } else {
        for (let index = 1; index < settingStr.length - 1; index++) {
          const moduleItem = settingStr[index].trim();
          if (moduleItem === '') {
            console.error(`Please check ${settingPath}.`);
            return false;
          } else if (moduleItem === ',') {
            continue;
          } else {
            moduleListForComponent.push(moduleItem.slice(1, settingStr[index].length));
          }
        }
        return moduleListForComponent;
      }
    }
  } catch (error) {
    console.error(`Please check ${settingPath}.`);
    return false;
  }
}

function checkComponentName(componentName, componentList) {
  if (!componentName) {
    console.error('Component name must be required!');
    return false;
  }
  if (componentList.includes(componentName)) {
    console.error('Component name already exists!');
    return false;
  }
  return true;
}

function updateManifest(manifestPath, componentName) {
  try {
    const manifestData = JSON.parse(fs.readFileSync(manifestPath));
    const defaultComponentData =
    {
      pages: [
        'pages/index/index'
      ],
      name: componentName,
      window: {
        designWidth: 720,
        autoDesignWidth: false
      }
    };
    manifestData.js.push(defaultComponentData);
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 4));
    return true;
  } catch (error) {
    console.error('Replace component info error.');
    return false;
  }
}

function createInSource(componentName, templateDir) {
  const src = path.join(templateDir, 'app/source/entry/default');
  const dist = path.join(`${projectDir}/${componentName}/`);
  try {
    fs.mkdirSync(dist, { recursive: true });
    return copy(src, dist);
  } catch (error) {
    console.error('Error occurs when creating in source.');
    return false;
  }
}

function createComponent() {
  projectDir = process.cwd();
  if (!checkCurrentDir(projectDir)) {
    console.error(`Please go to your ${path.join('projectName', 'source', 'ModuleName')} and create component again.`);
    return false;
  }
  let templateDir = path.join(__dirname, '../../../templates');
  if (!fs.existsSync(templateDir)) {
    templateDir = path.join(__dirname, 'template');
  }
  const manifestPath = path.join(projectDir, 'manifest.json');
  let manifestFile;
  try {
    manifestFile = JSON.parse(fs.readFileSync(manifestPath));
  } catch (error) {
    console.error('Read manifest.json file filed.');
    return false;
  }
  const componentList = getComponentList(manifestFile);
  if (componentList.length === 0) {
    createInSource('default', templateDir);
  } else {
    const question = [{
      name: 'componentName',
      type: 'input',
      message: 'Please enter the component name:',
      validate(val) {
        return checkComponentName(val, componentList);
      }
    }];
    inquirer.prompt(question).then(answers => {
      if (createInSource(answers.componentName, templateDir)) {
        return updateManifest(manifestPath, answers.componentName);
      }
    });
  }
}

module.exports = createComponent;
