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

const {
  SEARCH_RESULT_NOT_FOUND,
  SEARCH_COMPONENT_TYPE,
} = require('./constants');
const {
  isAlpha,
  createSearchData,
  readFileLines,
} = require('./utils');

function getComponentName(fileData, notSupportApi) {
  const lines = readFileLines(fileData.path);
  if (!lines || lines.length === 0) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const lineIndex = fileData.line - 1;
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const lineString = lines[lineIndex];
  if (!lineString || !lineString.includes(notSupportApi)) {
    return SEARCH_RESULT_NOT_FOUND;
  }

  const trimmedLine = lineString.trim();
  if (trimmedLine.length === 0 || trimmedLine.charAt(0) !== '.') {
    return SEARCH_RESULT_NOT_FOUND;
  }

  let searchData = createSearchData(2, true, SEARCH_COMPONENT_TYPE.POINT_TYPE);

  while (searchData.isWhileIn) {
    const targetLineIndex = fileData.line - searchData.nowIndex;
    if (targetLineIndex < 0 || targetLineIndex >= lines.length || lines[targetLineIndex] === undefined) {
      break;
    }

    const currentTrimmed = lines[targetLineIndex].trim();

    if (currentTrimmed.length > 0 && currentTrimmed.charAt(0) === '.') {
      searchData.whileFindType = SEARCH_COMPONENT_TYPE.POINT_TYPE;
      searchData.nowIndex++;
    } else if (currentTrimmed === '})' || currentTrimmed === '}))') {
      searchData.whileFindType = SEARCH_COMPONENT_TYPE.CLOSURE_TYPE;
      searchData.nowIndex++;
    } else {
      searchData = resolveComponentNameBranch(fileData, searchData, lines);
    }
  }

  return searchData.componentName;
}

function resolveComponentNameBranch(fileData, searchData, lines) {
  const nowSearchData = createSearchData(
    searchData.nowIndex,
    searchData.isWhileIn,
    searchData.whileFindType
  );

  const targetLineIndex = fileData.line - nowSearchData.nowIndex;
  if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
    nowSearchData.isWhileIn = false;
    return nowSearchData;
  }

  const nowLine = lines[targetLineIndex].trim();
  if (!nowLine) {
    nowSearchData.isWhileIn = false;
    return nowSearchData;
  }

  const nowLineLength = nowLine.length;

  if (nowSearchData.whileFindType === SEARCH_COMPONENT_TYPE.POINT_TYPE) {
    resolvePointTypeBranch(nowSearchData, nowLine, nowLineLength);
  } else if (nowSearchData.whileFindType === SEARCH_COMPONENT_TYPE.CLOSURE_TYPE) {
    resolveClosureTypeBranch(nowSearchData, nowLine);
  } else if (nowSearchData.whileFindType === SEARCH_COMPONENT_TYPE.PROPERTY_TYPE) {
    resolvePropertyTypeBranch(nowSearchData, nowLine);
  } else if (nowSearchData.whileFindType === SEARCH_COMPONENT_TYPE.PARTNER_TYPE) {
    resolvePartnerTypeBranch(nowSearchData, nowLine);
  }

  return nowSearchData;
}

function resolvePointTypeBranch(searchData, line, lineLength) {
  if (lineLength >= 2 && line.slice(lineLength - 2, lineLength) === '})') {
    if (line.includes('({')) {
      const componentIndex = line.indexOf('({');
      searchData.componentName = line.slice(0, componentIndex);
      searchData.isWhileIn = false;
    } else {
      searchData.whileFindType = SEARCH_COMPONENT_TYPE.PROPERTY_TYPE;
      searchData.nowIndex++;
    }
  } else if (lineLength >= 1 && line.slice(lineLength - 1, lineLength) === ')') {
    if (line.includes('(')) {
      const componentIndex = line.indexOf('(');
      searchData.componentName = line.slice(0, componentIndex);
      searchData.isWhileIn = false;
    } else {
      searchData.whileFindType = SEARCH_COMPONENT_TYPE.PARTNER_TYPE;
      searchData.nowIndex++;
    }
  } else {
    searchData.isWhileIn = false;
  }
}

function resolveClosureTypeBranch(searchData, line) {
  if (line.includes('=> {' && line.trim().charAt(0) === '.') {
    searchData.whileFindType = SEARCH_COMPONENT_TYPE.POINT_TYPE;
    searchData.nowIndex++;
  } else if (line.includes('({')) {
    const componentIndex = line.trim().indexOf('({');
    searchData.componentName = line.trim().slice(0, componentIndex);
    searchData.isWhileIn = false;
  } else {
    searchData.nowIndex++;
  }
}

function resolvePropertyTypeBranch(searchData, line) {
  if (line.includes('({')) {
    const componentIndex = line.indexOf('({');
    searchData.componentName = line.slice(0, componentIndex);
    searchData.isWhileIn = false;
  } else {
    searchData.nowIndex++;
  }
}

function resolvePartnerTypeBranch(searchData, line) {
  if (line.includes('(')) {
    const componentIndex = line.indexOf('(');
    searchData.componentName = line.slice(0, componentIndex);
    searchData.isWhileIn = false;
  } else {
    searchData.nowIndex++;
  }
}

module.exports = {
  getComponentName,
  resolveComponentNameBranch,
  resolvePointTypeBranch,
  resolveClosureTypeBranch,
  resolvePropertyTypeBranch,
  resolvePartnerTypeBranch,
};
