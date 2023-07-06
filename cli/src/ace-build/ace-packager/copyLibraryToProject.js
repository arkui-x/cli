/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const path = require('path');
const { Platform, platform } = require('../../ace-check/platform');
const { copy } = require('../../ace-create/project');
const { getAarName } = require('../../util');
const { arkuiXSdkDir } = require('../../ace-check/configs');
const { appCpu2SdkLibMap, appCpu2DestLibDir, clearLibBeforeCopy } = require('./globalConfig');
const { updateIosProjectPbxproj } = require('./adjustPbxproj4Framework');
const arkUIXSdkName = 'arkui-x';
let arkUIXSdkRootLen = 0;
let projectRootLen = 0;
function getSubProjectDir(fileType, projectDir) {
  if (fileType === 'apk') {
    return ['app'];
  } else if (fileType === 'app' || fileType === 'framework' || fileType === 'xcframework') {
    return ['ios'];
  } else if (fileType === 'aar') {
    return getAarName(projectDir);
  }
}

/**
 *disable log output for current module
 **/
const printLogControl = false;

function printLog() {
  if (printLogControl) {
    let info = '';
    for (const argument in arguments) {
      info = info + arguments[argument];
    }
    console.log(info);
  }
}

/*
* return process option when a lib file is not found
* current implementation ,return 2 -- ignore all
* libraryPath --- the libfile that can't be found
* return number：
* 0 --- throw exception , break current copying library process
* 1 --- ignore current error and  continue
* 2 --- ignore all not found error on libfiles and continue
 */
function processOnNotFound() {
  return 2;
}

/**
 * load a json file and return json object
 **/
function getJsonConfig(apiConfigPath) {
  if (fs.existsSync(apiConfigPath)) {
    try {
      printLog('\tload:', apiConfigPath);
      return JSON.parse(fs.readFileSync(apiConfigPath));
    } catch (err) {
      printLog('\tload error:', apiConfigPath, '::', err);
      throw new Error('load error:' + apiConfigPath + ', please check ');
    }
  } else {
    printLog('\tcould not find: ', apiConfigPath);
    throw new Error('could not find: ' + apiConfigPath + ', please check ');
  }
}

function getCpuList(buildProject, projectDir, system) {
  if (system === 'android') {
    const androidGradlePath = path.join(projectDir,
      '/android/' + buildProject + '/build.gradle');
    console.log('\nandroid Gradle File:', androidGradlePath);
    if (fs.existsSync(androidGradlePath)) {
      let gradleData = fs.readFileSync(androidGradlePath, 'utf-8');
      gradleData = gradleData.trim().split('\n');
      let ndkList;
      gradleData.some(element => {
        if (element.indexOf(`abiFilters`) >= 0) {
          ndkList = '[' + element.replace(`abiFilters`, '') + ']';
          ndkList = JSON.parse(ndkList);
        }
      });
      if (!ndkList) {
        console.log('could not find  abiFilters , please check');
      }
      return ndkList;
    }
  } else {
    return ['arm64'];
  }
}

function deleteOldFile(deleteFilePath) {
  try {
    if (fs.existsSync(deleteFilePath)) {
      const files = fs.readdirSync(deleteFilePath);
      files.forEach(function(file, index) {
        const curPath = path.join(deleteFilePath, file);
        if (fs.statSync(curPath).isDirectory()) {
          deleteOldFile(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(deleteFilePath);
    }
  } catch (error) {
    printLog('deleteOldfile:', error);
  }
}

function loaderArchType(fileType, cmd, projectDir, system, depMap, apiConfigMap) {
  let compileType = 'release';
  if (cmd.debug) {
    compileType = 'debug';
  }
  if (cmd.release) {
    compileType = 'release';
  }
  const subProjectNameList = getSubProjectDir(fileType, projectDir);
  let allCheckMap = new Map();
  let depCheckMap = new Map();
  subProjectNameList.forEach(buildProject => {
    const cpuList = getCpuList(buildProject, projectDir, system);
    printLog('\nbuildSubProject : ', buildProject, '  Cpu List : ', cpuList);
    for (const cpuIndex in cpuList) {
      const archType = appCpu2SdkLibMap[system][cpuList[cpuIndex]][compileType][0];
      const destLibDirMap = appCpu2DestLibDir[system][cpuList[cpuIndex]];
      depCheckMap = copyLibrary(projectDir, archType, depMap, depCheckMap, system,
        destLibDirMap, buildProject);
      allCheckMap = makeAllLibraryCheckMap(projectDir, archType, apiConfigMap, system,
        destLibDirMap, allCheckMap, buildProject);
    }
  });
  return {allCheckMap: allCheckMap, depCheckMap: depCheckMap};
}

let ignoreAll = false;

function autoMakeDir(projectDir, destLibDirMap, buildProject) {
  Object.keys(destLibDirMap).forEach((fileType) => {
    let filePath = path.join(projectDir, destLibDirMap[fileType]);
    filePath = filePath.replace('{subdir}', buildProject);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
  });
}

function copyLibrary(projectDir, archType, depMap, depFileMap, system, destLibDirMap, buildProject) {
  system = system.replace('-simulator', '');
  autoMakeDir(projectDir, destLibDirMap, buildProject);
  depMap.forEach(function(value, key) {
    const paths = value['library'][system];
    for (let libraryPath in paths) {
      libraryPath = paths[libraryPath].replace('arch_type', archType);
      libraryPath = libraryPath.replace('build_modes', archType);
      const fileType = libraryPath.split('.').pop();
      const checkResult = checkLibraryPath(libraryPath);
      if (!checkResult) {
        let guestOption = 1;
        printLog('\t', key, ':Error ==> cannot find library:', libraryPath);
        if (!ignoreAll) {
          guestOption = processOnNotFound();
        }
        if (!guestOption || guestOption === 0) {
          throw new Error('library not found: ' + libraryPath);
        } else if (guestOption === 2) {
          ignoreAll = true;
        }
      }
      if (!destLibDirMap[fileType]) {
        throw new Error('Unkown Target Path in Project for File Type:' + fileType +
        ',check appCpu2DestLibDir in configuration file :globalConfig.js ,Please!');
      }
      let filePath = path.join(projectDir, destLibDirMap[fileType]);
      filePath = filePath.replace('{subdir}', buildProject);
      let usedSet = depFileMap.get(filePath);
      if (!usedSet) {
        usedSet = new Set();
        depFileMap.set(filePath, usedSet);
      }
      filePath = filePath.replace('{subdir}', buildProject);
      let libraryName;
      if (platform === Platform.Windows) {
        libraryName = libraryPath.split('\\').pop();
      } else {
        libraryName = libraryPath.split('/').pop();
      }
      usedSet.add(libraryName);
      if (checkResult) {
        copyOneLibrary(key, libraryPath, filePath);
      }
    }
  });
  return depFileMap;
}

function makeAllLibraryCheckMap(projectDir, archType, srcMap, system, destLibDirMap, outMap, buildProject) {
  system = system.replace('-simulator', '');
  if (!outMap) {
    outMap = new Map();
  }
  srcMap.forEach(function(value, key) {
    const paths = value['library'][system];
    for (let libraryPath in paths) {
      libraryPath = paths[libraryPath].replace('arch_type', archType);
      libraryPath = libraryPath.replace('build_modes', archType);
      const fileType = libraryPath.split('.').pop();
      if (checkLibraryPath(libraryPath)) {
        let libraryName;
        if (platform === Platform.Windows) {
          libraryName = libraryPath.split('\\').pop();
        } else {
          libraryName = libraryPath.split('/').pop();
        }
        if (destLibDirMap[fileType]) {
          let filePath = path.join(projectDir, destLibDirMap[fileType]);
          filePath = filePath.replace('{subdir}', buildProject);
          let outset = outMap.get(filePath);
          if (!outset) {
            outMap.set(filePath, new Set());
            outset = outMap.get(filePath);
          }
          outset.add(libraryName);
        }
      }
    }
  });
  return outMap;
}

function checkLibraryPath(libraryPath) {
  if (fs.existsSync(libraryPath)) {
    return true;
  } else {
    return false;
  }
}

function copyOneLibrary(moduleName, src, dest) {
  if (platform === Platform.Windows) {
    dest = path.join(dest, src.split('\\').pop());
  } else {
    dest = path.join(dest, src.split('/').pop());
  }
  const src0 = src.substr(arkUIXSdkRootLen);
  const tar0 = dest.substr(projectRootLen);
  if (fs.statSync(src).isFile()) {
    try {
      printLog('\t', moduleName, ': copy {' + arkUIXSdkName + ' SDK}', src0 + '\n\t\tto ', tar0);
      fs.writeFileSync(dest, fs.readFileSync(src));
    } catch (err) {
      printLog('\t', moduleName, ': copy Librarys err:', err);
    }
  } else {
    printLog('\t', moduleName, ': copy {' + arkUIXSdkName + ' SDK}', src0 + '\n\t\tto ', tar0);
    copy(src, dest);
  }
}

function processLib(libpath, depLibSet, allLibSet, removeUnused) {
  if (fs.existsSync(libpath)) {
    const files = fs.readdirSync(libpath);
    files.forEach(function(file, index) {
      const curPath = path.join(libpath, file);
      if (!depLibSet.has(file) && allLibSet.has(file)) {
        printLog('found unused Lib Dir:[', libpath, '=>', file, '],',
          removeUnused ? ', delete this unused!' : ' and leave it unused!');
        if (removeUnused) {
          deleteOldFile(curPath);
        }
      }
    });
  }
}

/**
 * main function to copy library files into project lib directory
 **/
function copyLibraryToProject(fileType, cmd, projectDir, system) {
  const apiConfigMap = loadApiConfigJson(arkuiXSdkDir);
  const collectionSet = loadCollectionJson(projectDir);
  arkUIXSdkRootLen = arkuiXSdkDir.length;
  projectRootLen = projectDir.length;
  let moduleNameList;
  collectionSet.forEach(moduleName => {
    if (!moduleNameList) {
      moduleNameList = moduleName;
    } else {
      moduleNameList = moduleNameList + ' , ' + moduleName;
    }
  });
  if (!moduleNameList) {
    moduleNameList = '';
  }
  printLog('source dependent modules: [', moduleNameList, ']');
  let depMap = new Map();
  depMap = finddeps(collectionSet, depMap, apiConfigMap, system);
  const checkMap = loaderArchType(fileType, cmd, projectDir, system, depMap, apiConfigMap);
  checkMap.depCheckMap.forEach(function(depCheckSet, libpath) {
    const allLibSet = checkMap.allCheckMap.get(libpath);
    if (!allLibSet) {
      throw new Error('Could not find any lib for ' + system +
        ',in ['+arkuiXSdkDir+'], Check config for ArkUI-X SDK,Please!');
    }
    processLib(libpath, depCheckSet, allLibSet, clearLibBeforeCopy);
  });
  if (system === 'ios') {
    checkMap.allCheckMap.forEach(function(allLibSet, libpath) {
      updateIosProjectPbxproj(fileType, projectDir, depMap, system,
        true, function(libname) { }, allLibSet);
    });
  }
}

/*
specifications for callbackFunction
fullname ---absolute path ,
fileName ---current file or directory,
isDir   --true --directory，false file
fileProcessRule --user defined file process rule
args   ---user define argument
return true--continue traverse, false --end traversing
 callbackFunction(fullname , fileName, isDir, fileProcessRule, args)

specification for ruleCheckerFunction
fullname ---absolute path ,
fileName ---current file or directory,
isDir   --true --directory，false file
dirProcessRule --user defined file process rule
return  ---new rule for file fileName
  ruleCheckerFunction(fullname, fileName, isDir, dirProcessRule)
*/
function traversalDir(dir, callbackFunction, args, ruleCheckerFunction, dirProcessRule) {
  if (!callbackFunction) {
    return args;
  }
  const readlist = fs.readdirSync(dir);
  for (const key in readlist) {
    const fullname = path.join(dir, readlist[key]);
    const isDir = fs.statSync(fullname).isDirectory();
    let fileProcessRule = dirProcessRule;
    if(ruleCheckerFunction) {
      fileProcessRule = ruleCheckerFunction(fullname, readlist[key], isDir, dirProcessRule);
    }

    const goonProc = callbackFunction(fullname, readlist[key], isDir, fileProcessRule, args);
    if (!goonProc) {
      return args;
    }
    if (isDir) {
      args = traversalDir(fullname, callbackFunction, args, ruleCheckerFunction, fileProcessRule);
    }
  }
  return args;
}

const defaultDir = 'ohos/';

function loadCollectionJson(projectDir) {
  printLog('load dependent modules from project:');
  const loadState = {};
  loadState.collectionSet = new Set();
  loadState.moduleCount = 0;
  loadState.componentCount = 0;
  const startProcess = false;
  
  /**
   * start to load json file after a subdir named 'build' was found
   */
  try {
    traversalDir(defaultDir, (fullname, fileName, isDir, startProcess0, loadState) => {
      if (!startProcess0) {
        return true;
      }
      if (fileName === 'component_collection.json') {
        loadState.collectionSet = loadCollection(getJsonConfig(fullname), loadState.collectionSet);
        loadState.componentCount += 1;
      } else if (fileName === 'module_collection.json') {
        loadState.collectionSet = loadCollection(getJsonConfig(fullname), loadState.collectionSet);
        loadState.moduleCount += 1;
      }
      return true;
    }, loadState,
    (fullname, fileName, isDir, startProcess0) => {
      if(startProcess0 || fileName === 'build') {
        return true;
      } else {
        return false;
      }
    } , startProcess);
    printLog('\t\t' + loadState.componentCount + ' component_collection.json file(s) loaded!');
    printLog('\t\t' + loadState.moduleCount + ' module_collection.json file(s) loaded!');
  } catch (err) {
    printLog('get componentCollection data failed');
  }
  return loadState.collectionSet;
}

function loadApiConfigJson(arkuiXSdkDir) {
  printLog('load apiconfig from SDK');
  const engineApiConfig = getJsonConfig(path.join(arkuiXSdkDir,
    '/engine/apiConfig.json'));
  const pluginsApiConfig = getJsonConfig(path.join(arkuiXSdkDir,
    '/plugins/api/apiConfig.json'));
  const pluginsComponentApiConfig = getJsonConfig(path.join(arkuiXSdkDir,
    '/plugins/component/apiConfig.json'));
  let apiConfigMap = new Map();
  let rootpath = {
    'android': path.join(arkuiXSdkDir, '/engine'),
    'ios': path.join(arkuiXSdkDir, '/engine')
  };
  apiConfigMap = loadApiConfig(rootpath, engineApiConfig, apiConfigMap);
  rootpath = {
    'android': path.join(arkuiXSdkDir, '/plugins/api'),
    'ios': path.join(arkuiXSdkDir, '/plugins/api')
  };
  apiConfigMap = loadApiConfig(rootpath, pluginsApiConfig, apiConfigMap);
  rootpath = {
    'android': path.join(arkuiXSdkDir, '/plugins/component'),
    'ios': path.join(arkuiXSdkDir, '/plugins/component')
  };
  apiConfigMap = loadApiConfig(rootpath, pluginsComponentApiConfig, apiConfigMap);
  return apiConfigMap;
}

const baseModule = 'engine/arkui';

function finddeps(collectionSet, depMap, apiConfigMap, system) {
  depMap = findOneDep(baseModule, depMap, apiConfigMap, system);
  printLog('basic module : ', baseModule);
  depMap.forEach(function(value, key) {
    printLog('\t', key);
  });
  collectionSet.forEach(moduleName => {
    depMap = findOneDep(moduleName, depMap, apiConfigMap, system);
  });
  return depMap;
}

function findOneDep(moduleName, depMap, apiConfigMap, system) {
  if (depMap.has(moduleName)) {
    return depMap;
  }
  const moduleObj = apiConfigMap.get(moduleName);
  if (!moduleObj) {
    printLog('error: cannot find the define of [' + moduleName + ']');
    return depMap;
  }
  depMap.set(moduleName, moduleObj);
  const moduleNameDeps = moduleObj.deps;
  if (!moduleNameDeps) {
    return depMap;
  }
  if (!moduleNameDeps[system]) {
    return depMap;
  }
  const moduleNameDepsSystem = moduleNameDeps[system];
  for (const depsModuleName in moduleNameDepsSystem) {
    depMap = findOneDep(moduleNameDepsSystem[depsModuleName], depMap, apiConfigMap, system);
  }
  return depMap;
}

function loadCollection(collection, collectionSet) {
  for (const key in collection) {
    const collectionList = collection[key];
    for (const modules in collectionList) {
      collectionSet.add(collectionList[modules]);
    }
  }
  return collectionSet;
}

function loadApiConfig(RootPath, ApiConfig, apiConfigMap) {
  if(ApiConfig) {
    try {
      ApiConfig.forEach(element => {
        let temppath = element.library.android;
        for (let i = 0; i < temppath.length; i++) {
          temppath[i] = path.join(RootPath.android, temppath[i]);
        }
        element.library.android = temppath;
        apiConfigMap.set(element.module, element);
        temppath = element.library.ios;
        for (let i = 0; i < temppath.length; i++) {
          temppath[i] = path.join(RootPath.ios, temppath[i]);
        }
        element.library.ios = temppath;
        apiConfigMap.set(element.module, element);
      });
    } catch (err) {
      throw new Error('Error apiConfig:'+err);
    }
  }
  return apiConfigMap;
}

module.exports = { copyLibraryToProject };

