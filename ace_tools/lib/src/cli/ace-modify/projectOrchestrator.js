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

const inquirer = require('inquirer');
const {
  ARKUIX_DIR,
  BUILD_PROFILE_PATH,
  MODIFY_TYPE_PROJECT,
  MODIFY_TYPE_MODULES,
} = require('./constants');
const {
  logError,
  fileExists,
} = require('./utils');
const {
  collectModulesFromBuildProfile,
  collectDesignatedModulesFromBuildProfile,
} = require('./moduleInfo');
const {
  processAllModules,
  processDesignatedModules,
} = require('./moduleProcessor');

function checkNotInProjectModules(modules, projectModules) {
  const notFound = modules.filter(m => !projectModules.includes(m));
  if (notFound.length > 0) {
    logError(`Error: You entered {${notFound.join(',')}} module is not found in the project. Please confirm!`);
  }
  return notFound;
}

function reorderModulesWithEntry(modulesArray, modulesTypeArray, entryModule) {
  const reordered = [entryModule];
  const reorderedTypes = ['entry'];

  for (let i = 0; i < modulesArray.length; i++) {
    if (modulesTypeArray[i] !== 'entry') {
      reordered.push(modulesArray[i]);
      reorderedTypes.push(modulesTypeArray[i]);
    }
  }

  return { reordered, reorderedTypes };
}

function modifyModulesWithOneEntry(modulesArray, modulesTypeArray, entryModule, modifyType, platforms) {
  const { reordered, reorderedTypes } = reorderModulesWithEntry(modulesArray, modulesTypeArray, entryModule);

  if (modifyType === MODIFY_TYPE_PROJECT) {
    processAllModules(reordered, reorderedTypes, platforms);
  } else {
    processDesignatedModules(reordered, reorderedTypes, platforms);
  }
}

function modifyModulesWithMultiEntry(modulesArray, modulesTypeArray, entryTypeArray, modifyType, platforms) {
  const entryList = entryTypeArray.join(' ');

  let message;
  if (modifyType === MODIFY_TYPE_PROJECT) {
    message = `The project has more than two entry modules (${entryList}). Please enter a module as the cross-platform entry:`;
  } else {
    message = `You designated modules has more than two entry modules (${entryList}). Please enter a module as the cross-platform entry:`;
  }

  inquirer.prompt([{
    name: 'repair',
    type: 'input',
    message,
    validate(val) {
      return entryTypeArray.includes(val) ? true : `please enter one of (${entryList}):`;
    },
  }]).then(answers => {
    modifyModulesWithOneEntry(modulesArray, modulesTypeArray, answers.repair, modifyType, platforms);
  });
}

function validateProjectNotCrossPlatform() {
  if (fileExists(ARKUIX_DIR)) {
    logError(`Error: The current project is a cross-platform project. If you need to modify the new module, run the ace modify --modules command.`);
    return false;
  }
  return true;
}

function validateBuildProfileExists() {
  if (!fileExists(BUILD_PROFILE_PATH)) {
    logError(`Error: Operation failed. Go to your project directory and try again.`);
    return false;
  }
  return true;
}

function modifyProject(platforms) {
  if (!validateProjectNotCrossPlatform()) {
    return;
  }

  const collected = collectModulesFromBuildProfile();
  if (!collected) {
    logError(`Error: Operation failed. Go to your project directory and try again.`);
    return;
  }

  const { modules, moduleTypes, entryModules } = collected;

  if (entryModules.length < 1) {
    logError(`Error: The project does not have an entry module，cannot be modify!`);
    return;
  }

  if (entryModules.length === 1) {
    modifyModulesWithOneEntry(modules, moduleTypes, entryModules[0], MODIFY_TYPE_PROJECT, platforms);
  } else {
    modifyModulesWithMultiEntry(modules, moduleTypes, entryModules, MODIFY_TYPE_PROJECT, platforms);
  }
}

function modifyModules(modules, platforms) {
  if (!validateBuildProfileExists()) {
    return;
  }

  const collected = collectDesignatedModulesFromBuildProfile(modules);
  if (!collected) {
    logError(`Error: Operation failed. Go to your project directory and try again.`);
    return;
  }

  const { modulesArray, modulesTypeArray, entryTypeArray, hasFeatureModule } = collected;
  checkNotInProjectModules(modules, modulesArray);

  const hasArkuiX = fileExists(ARKUIX_DIR);
  if (hasArkuiX && entryTypeArray.length > 0) {
    logError(`Error: The entered modules contains entry type module. The project is a cross-platform project and cannot be modified`);
    return;
  }

  if (entryTypeArray.length < 1) {
    if (!hasFeatureModule && !hasArkuiX) {
      logError(`Error: The entered module does not contains an entry or feature type module. cannot be modified`);
      return;
    }
    processDesignatedModules(modulesArray, modulesTypeArray, platforms);
    return;
  }

  if (entryTypeArray.length === 1) {
    modifyModulesWithOneEntry(modulesArray, modulesTypeArray, entryTypeArray[0], MODIFY_TYPE_MODULES, platforms);
  } else {
    modifyModulesWithMultiEntry(modulesArray, modulesTypeArray, entryTypeArray, MODIFY_TYPE_MODULES, platforms);
  }
}

module.exports = {
  modifyProject,
  modifyModules,
  checkNotInProjectModules,
  reorderModulesWithEntry,
  modifyModulesWithOneEntry,
  modifyModulesWithMultiEntry,
  validateProjectNotCrossPlatform,
  validateBuildProfileExists,
};
