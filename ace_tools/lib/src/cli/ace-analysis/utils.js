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
  FROM_KEYWORD_LENGTH,
  FROM_SUFFIX_LENGTH,
  FROM_KEYWORD,
  IMPORT_KEYWORD,
  DTS_SUFFIX,
  DETS_SUFFIX,
  SEARCH_RESULT_NOT_FOUND,
  ANSI_ESCAPE_REGEX,
} = require('./constants');

function logError(message) {
  console.log('\x1B[31m%s\x1B[0m', message);
}

function logInfo(message) {
  console.log(message);
}

function isUpperCase(char) {
  return /[A-Z]/.test(char);
}

function isAlpha(char) {
  return /^[A-Za-z]+$/.test(char);
}

function isDeclarationFile(filename) {
  return filename.includes(DTS_SUFFIX) || filename.includes(DETS_SUFFIX);
}

function stripAnsiEscapes(text) {
  return text.replace(ANSI_ESCAPE_REGEX, '');
}

function extractFromPath(importLine) {
  const fromIndex = importLine.indexOf(FROM_KEYWORD);
  if (fromIndex === -1) {
    return '';
  }
  const fromFile = importLine.slice(
    fromIndex + FROM_KEYWORD_LENGTH,
    importLine.length - FROM_SUFFIX_LENGTH
  ).trim();
  return fromFile;
}

function isImportLine(line) {
  return line.includes(IMPORT_KEYWORD) && line.includes(FROM_KEYWORD);
}

function extractImportNames(importLine) {
  const startIndex = importLine.indexOf('{');
  const endIndex = importLine.indexOf('}');
  if (startIndex === -1 || endIndex === -1) {
    return [];
  }
  const inner = importLine.slice(startIndex + 1, endIndex);
  return inner.split(',').map(name => name.trim()).filter(Boolean);
}

function isRelativePath(filePath) {
  return filePath.includes('../') || filePath.includes('/');
}

function containsApiReference(line, apiName) {
  const patterns = [
    `{${apiName}}`,
    `{${apiName},`,
    ` ${apiName},`,
    ` ${apiName} `,
    ` ${apiName}}`,
    `{${apiName} `,
    `{ ${apiName}`,
    `${apiName}}`,
    `${apiName},`,
  ];
  return patterns.some(pattern => line.includes(pattern));
}

function createApiData(number = '', apiName = '', dtsFile = '', selfFile = '') {
  return { number, apiName, dtsFile, selfFile };
}

function createFileData(filePath = '', fileName = '', fileLine = '', fileColumn = '') {
  return { path: filePath, name: fileName, line: fileLine, column: fileColumn };
}

function createSearchData(indexData, isInData, findTypeData, componentName = ' ') {
  return {
    nowIndex: indexData,
    isWhileIn: isInData,
    whileFindType: findTypeData,
    componentName: componentName,
  };
}

function readFileLines(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs.readFileSync(filePath, 'utf8').split('\n');
}

function readFileContent(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function resolveKitFilePath(kitFileName) {
  const { getGlobalSdkPath, PATH_KIT_HMS, PATH_KIT_OH } = require('./constants');
  const hmsPath = `${getGlobalSdkPath()}${PATH_KIT_HMS}${kitFileName}.d.ts`;
  if (fs.existsSync(hmsPath)) {
    return hmsPath;
  }
  const ohPath = `${getGlobalSdkPath()}${PATH_KIT_OH}${kitFileName}.d.ts`;
  if (fs.existsSync(ohPath)) {
    return ohPath;
  }
  return null;
}

function safeDeleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function safeDeleteFileAsync(filePath, callback) {
  fs.unlink(filePath, (error) => {
    if (error && callback) {
      callback(error);
    }
  });
}

function toCamelCaseToSnakeCase(str) {
  let result = str.charAt(0).toLowerCase();
  for (let i = 1; i < str.length; i++) {
    if (isUpperCase(str.charAt(i))) {
      result += '_';
    }
    result += str.charAt(i).toLowerCase();
  }
  return result;
}

function safeModuleName(name) {
  return name.replace(/-/g, '_');
}

module.exports = {
  logError,
  logInfo,
  isUpperCase,
  isAlpha,
  isDeclarationFile,
  stripAnsiEscapes,
  extractFromPath,
  isImportLine,
  extractImportNames,
  containsApiReference,
  createApiData,
  createFileData,
  createSearchData,
  readFileLines,
  readFileContent,
  fileExists,
  resolveKitFilePath,
  safeDeleteFile,
  safeDeleteFileAsync,
  toCamelCaseToSnakeCase,
  safeModuleName,
};
