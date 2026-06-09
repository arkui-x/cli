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
const {
  getGlobalSdkPath,
  PATH_TRAVERSAL_COMPONENT,
  PATH_TRAVERSAL_API,
  PATH_TRAVERSAL_HMS_API,
  SEARCH_RESULT_NOT_FOUND,
  KIT_PREFIX,
  DTS_SUFFIX,
  DETS_SUFFIX,
  ANNOTATION_SINCE,
  ANNOTATION_DEPRECATED,
  ANNOTATION_CROSSPLATFORM,
} = require('./constants');
const {
  isDeclarationFile,
  isAlpha,
  isImportLine,
  extractFromPath,
  extractImportNames,
  containsApiReference,
  createApiData,
  createFileData,
  readFileLines,
  resolveKitFilePath,
  camelToSnakeCase,
} = require('./utils');
const { getModuleNameFromBuildLog, getFileDataFromBuildLog, getNotSupportApi } = require('./buildRunner');
const { getComponentName } = require('./componentAnalyzer');

function getDtsFileFromImport(filePath, notSupportApi) {
  const lines = readFileLines(filePath);
  for (let i = 0; i < lines.length; i++) {
    if (containsApiReference(lines[i], notSupportApi) && isImportLine(lines[i])) {
      return resolveApiImportLine(lines[i], notSupportApi);
    }
    if (lines[i].includes('import {') && !lines[i].includes('from')) {
      return resolveMultiLineImport(lines, i, notSupportApi);
    }
  }
  return SEARCH_RESULT_NOT_FOUND;
}

function resolveApiImportLine(importLine, notSupportApi) {
  const importFileName = extractFromPath(importLine);
  if (importFileName.includes(KIT_PREFIX)) {
    return searchApiInKitFile(importFileName, notSupportApi);
  }
  return `${importFileName}${DTS_SUFFIX}`;
}

function resolveMultiLineImport(lines, importIndex, notSupportApi) {
  let fromOffset = 1;
  while (importIndex + fromOffset < lines.length && !lines[importIndex + fromOffset].includes(' from ')) {
    fromOffset++;
  }

  if (importIndex + fromOffset >= lines.length) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const fromLineIndex = importIndex + fromOffset;
  const fromFile = extractFromPath(lines[fromLineIndex]);
  if (!fromFile) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const importNames = [];
  for (let i = 1; i < fromOffset; i++) {
    const name = lines[importIndex + i].trim().replace(/,/g, '');
    if (name) {
      importNames.push(name);
    }
  }

  if (!importNames.includes(notSupportApi)) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  if (fromFile.includes(KIT_PREFIX)) {
    return searchApiInKitFile(fromFile, notSupportApi);
  }
  return `${fromFile}${DTS_SUFFIX}`;
}

function searchApiInKitFile(kitFileName, notSupportApi) {
  const kitFilePath = resolveKitFilePath(kitFileName);
  if (!kitFilePath) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const lines = readFileLines(kitFilePath);
  for (const line of lines) {
    if (containsApiReference(line, notSupportApi) && isImportLine(line)) {
      const apiFile = extractFromPath(line);
      return `${apiFile}${DTS_SUFFIX}`;
    }
  }
  return SEARCH_RESULT_NOT_FOUND;
}

function getPointStartName(fileData) {
  const lines = readFileLines(fileData.path);
  if (!lines || lines.length === 0) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const lineString = lines[fileData.line - 1];
  if (!lineString || lineString === '') {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const nowApiIndex = fileData.column - 1;
  let endIndex = nowApiIndex - 1;
  let nowIndex = endIndex - 1;

  if (endIndex < 0) {
    return SEARCH_RESULT_NOT_FOUND;
  }
  if (lineString.charAt(endIndex) !== '.') {
    return SEARCH_RESULT_NOT_FOUND;
  }
  if (nowIndex < 0) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  while (isAlpha(lineString.charAt(nowIndex)) || lineString.charAt(nowIndex) === '.') {
    if (lineString.charAt(nowIndex) === '.') {
      endIndex = nowIndex;
      if (nowIndex - 1 < 0) {
        return SEARCH_RESULT_NOT_FOUND;
      }
      nowIndex--;
    } else {
      if (nowIndex - 1 < 0) {
        return lineString.slice(nowIndex, endIndex);
      }
      nowIndex--;
    }
  }

  return lineString.slice(nowIndex + 1, endIndex);
}

function getDtsFileFromComponent(componentName, notSupportApi) {
  const snakeName = camelToSnakeCase(componentName);
  const candidateFiles = [
    `${snakeName}${DTS_SUFFIX}`,
    `${snakeName}${DETS_SUFFIX}`,
    `${componentName.toLowerCase()}${DTS_SUFFIX}`,
    `${componentName.toLowerCase()}${DETS_SUFFIX}`,
  ];

  for (const fileName of candidateFiles) {
    const filePath = `${getGlobalSdkPath()}${PATH_TRAVERSAL_COMPONENT}${fileName}`;
    if (fs.existsSync(filePath) && isHaveNotSupportApiInFile(notSupportApi, filePath)) {
      return fileName;
    }
  }
  return SEARCH_RESULT_NOT_FOUND;
}

function isHaveNotSupportApiInFile(notSupportApi, filePath) {
  const lines = readFileLines(filePath);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(notSupportApi)) {
      continue;
    }

    const index = lines[i].indexOf(notSupportApi);
    const frontString = lines[i].slice(0, index);

    if (i - 3 < 0) {
      continue;
    }
    if (lines[i].trim().charAt(0) === '*') {
      continue;
    }

    const sinceLine = lines[i - 2];
    const deprecatedLine = lines[i - 3];
    const crossplatformLine = lines[i - 4];

    if (sinceLine.includes(ANNOTATION_SINCE) &&
        !sinceLine.includes(ANNOTATION_DEPRECATED) &&
        !deprecatedLine.includes(ANNOTATION_DEPRECATED) &&
        !sinceLine.includes(ANNOTATION_CROSSPLATFORM) &&
        !deprecatedLine.includes(ANNOTATION_CROSSPLATFORM) &&
        !crossplatformLine.includes(ANNOTATION_CROSSPLATFORM) &&
        !frontString.includes('(') &&
        !frontString.includes(':')) {
      return true;
    }
  }
  return false;
}

function getImportFileList(fileData) {
  const lines = readFileLines(fileData.path);
  const allImportFileList = [];

  for (const line of lines) {
    if (line.includes('import') && line.includes('{') && line.includes('}') && line.includes('from')) {
      allImportFileList.push(...getOneLineImportFileList(line));
    }
  }
  return allImportFileList;
}

function getOneLineImportFileList(searchLine) {
  const fromFile = extractFromPath(searchLine);
  if (!fromFile) {
    return [];
  }

  if (fromFile.includes(KIT_PREFIX)) {
    const importList = extractImportNames(searchLine);
    return getKitFileImportFileList(fromFile, importList);
  }

  if (fromFile.startsWith('./') || fromFile.startsWith('../')) {
    return [];
  }

  return [fromFile];
}

function getKitFileImportFileList(fromKitFile, importList) {
  const kitFilePath = resolveKitFilePath(fromKitFile);
  if (!kitFilePath) {
    return [];
  }

  const lines = readFileLines(kitFilePath);
  const fileList = [];

  for (const line of lines) {
    if (!isImportLine(line)) {
      continue;
    }

    const hasMatchingImport = importList.some(importName => containsApiReference(line, importName));
    if (hasMatchingImport) {
      const fromFile = extractFromPath(line);
      if (fromFile) {
        fileList.push(fromFile);
      }
    }
  }
  return fileList;
}

function isItemInList(item, list) {
  if (!list || list.length === 0) {
    return true;
  }
  return list.some(entry => item.includes(entry));
}

function traversalFolder(folderPath, notSupportApi, importFileList = null) {
  const searchList = [];
  if (!fs.existsSync(folderPath)) {
    return searchList;
  }

  const files = fs.readdirSync(folderPath);
  for (const item of files) {
    if (!isDeclarationFile(item)) {
      continue;
    }
    if (importFileList && importFileList.length > 0 && !isItemInList(item, importFileList)) {
      continue;
    }
    const filePath = path.join(folderPath, item);
    if (fs.statSync(filePath).isFile() && isHaveNotSupportApiInFile(notSupportApi, filePath)) {
      searchList.push(item);
    }
  }
  return searchList;
}

function getApiFileTraversal(notSupportApi, allImportFileList) {
  const sdkPath = getGlobalSdkPath();
  const searchDirs = [
    `${sdkPath}${PATH_TRAVERSAL_API}`,
    `${sdkPath}${PATH_TRAVERSAL_COMPONENT}`,
    `${sdkPath}${PATH_TRAVERSAL_HMS_API}`,
  ];

  let results = [];
  for (const dir of searchDirs) {
    results = results.concat(traversalFolder(dir, notSupportApi, allImportFileList));
  }

  const apiFolderPath = `${sdkPath}${PATH_TRAVERSAL_API}`;
  if (fs.existsSync(apiFolderPath)) {
    const subDirs = fs.readdirSync(apiFolderPath);
    for (const item of subDirs) {
      const subDirPath = path.join(apiFolderPath, item);
      if (fs.statSync(subDirPath).isDirectory()) {
        results = results.concat(traversalFolder(subDirPath, notSupportApi, allImportFileList));
      }
    }
  }

  if (results.length === 0) {
    return SEARCH_RESULT_NOT_FOUND;
  }
  if (results.length === 1) {
    return results[0];
  }
  return SEARCH_RESULT_NOT_FOUND;
}

function getApiFileTraversalAll(notSupportApi) {
  const sdkPath = getGlobalSdkPath();
  const searchDirs = [
    `${sdkPath}${PATH_TRAVERSAL_API}`,
    `${sdkPath}${PATH_TRAVERSAL_COMPONENT}`,
    `${sdkPath}${PATH_TRAVERSAL_HMS_API}`,
  ];

  let results = [];
  for (const dir of searchDirs) {
    results = results.concat(traversalFolder(dir, notSupportApi));
  }

  const apiFolderPath = `${sdkPath}${PATH_TRAVERSAL_API}`;
  if (fs.existsSync(apiFolderPath)) {
    const subDirs = fs.readdirSync(apiFolderPath);
    for (const item of subDirs) {
      const subDirPath = path.join(apiFolderPath, item);
      if (fs.statSync(subDirPath).isDirectory()) {
        results = results.concat(traversalFolder(subDirPath, notSupportApi));
      }
    }
  }

  if (results.length === 0) {
    return SEARCH_RESULT_NOT_FOUND;
  }
  if (results.length === 1) {
    return results[0];
  }
  if (results.length > 1) {
    return getDtsFileFromComponent(notSupportApi, notSupportApi);
  }
  return SEARCH_RESULT_NOT_FOUND;
}

function analysisBuildLogLine(line, nextLine, allDtsList, moduleApiList) {
  if (!line || line.length === 0 || !nextLine || nextLine.length === 0) {
    return;
  }

  const moduleName = getModuleNameFromBuildLog(line);
  const fileData = getFileDataFromBuildLog(line);
  const notSupportApi = getNotSupportApi(nextLine);

  if (!fileData || !fileData.path || !fileData.line || !fileData.column || !notSupportApi || !moduleName) {
    return;
  }

  let dtsFileName = getDtsFileFromImport(fileData.path, notSupportApi);

  if (dtsFileName === SEARCH_RESULT_NOT_FOUND) {
    const pointString = getPointStartName(fileData);
    if (pointString && pointString !== SEARCH_RESULT_NOT_FOUND) {
      dtsFileName = getDtsFileFromImport(fileData.path, pointString);
    }
  }

  if (dtsFileName === SEARCH_RESULT_NOT_FOUND) {
    const componentName = getComponentName(fileData, notSupportApi);
    if (componentName && componentName !== '') {
      dtsFileName = getDtsFileFromComponent(componentName, notSupportApi);
    }
  }

  if (dtsFileName === SEARCH_RESULT_NOT_FOUND) {
    const allImportFileList = getImportFileList(fileData);
    dtsFileName = getApiFileTraversal(notSupportApi, allImportFileList);
  }

  if (dtsFileName === SEARCH_RESULT_NOT_FOUND) {
    dtsFileName = getApiFileTraversalAll(notSupportApi);
  }

  if (dtsFileName === SEARCH_RESULT_NOT_FOUND) {
    return;
  }

  if (!allDtsList.has(dtsFileName)) {
    allDtsList.set(dtsFileName, []);
  }
  allDtsList.get(dtsFileName).push(notSupportApi);

  if (!moduleApiList.has(moduleName)) {
    moduleApiList.set(moduleName, []);
  }
  const moduleApiArray = moduleApiList.get(moduleName);
  const apiData = createApiData(
    `${moduleApiArray.length + 1}`,
    notSupportApi,
    dtsFileName,
    fileData.name
  );
  moduleApiArray.push(apiData);
}

module.exports = {
  analysisBuildLogLine,
  getDtsFileFromImport,
  getDtsFileFromComponent,
  getPointStartName,
  getImportFileList,
  getOneLineImportFileList,
  getKitFileImportFileList,
  getApiFileTraversal,
  getApiFileTraversalAll,
  isHaveNotSupportApiInFile,
  traversalFolder,
  searchApiInKitFile,
  isItemInList,
};
