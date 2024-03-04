/*
 * Copyright (c) 2022 Huawei Device Co., Ltd.
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

function requirementTitle(message, valid) {
  console.log(addPrefix(message, valid, `[√] `, `[X] `));
}

function optionTitle(message, valid) {
  console.log(addPrefix(message, valid, `[√] `, `[!] `));
}

function requirementInfo(message, valid, showdetail) {
  if (!valid || showdetail) {
    console.log(addPrefix(message, valid, `  • `, `  X `));
  }
}

function optionInfo(message, valid) {
  console.log(addPrefix(message, valid, `  • `, `  ! `));
}

function reletedInfo(message, valid) {
  if (valid) {
    console.log(addPrefix(message, true, `  • `));
  }
}

function addPrefix(message, valid, correctPrefix, errorPrefix) {
  const prefix = valid ? correctPrefix : errorPrefix;
  return prefix + message;
}

function showWarningInfo(msgs) {
  console.warn('\x1B[33m%s\x1B[0m', 'Warning: ');
  msgs.forEach(msg => {
    console.warn('\x1B[33m    %s\x1B[0m', `• ${msg}`);
  });
}

function cmpVersion(version1, version2) {
  const subVersions1 = version1.split('.');
  const subVersions2 = version2.split('.');
  const limit = Math.min(subVersions1.length, subVersions2.length);
  for (let i = 0; i < limit; i++) {
    if (parseInt(subVersions1[i]) === parseInt(subVersions2[i])) {
      continue;
    }
    return parseInt(subVersions1[i]) > parseInt(subVersions2[i]);
  }
  return 0;
}

module.exports = {
  requirementTitle,
  optionTitle,
  requirementInfo,
  optionInfo,
  reletedInfo,
  showWarningInfo,
  cmpVersion
};
