/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
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

// Zero-dependency error formatter. Kept as a leaf module so that lower-level
// domains (e.g. ace-devices) can share the unified output without depending
// on the util god-module (which would reintroduce a require cycle).
function printError(error, cause, solutions = [], rawError = null) {
  let msg = `\x1B[31mError: ${error}\x1B[0m`;
  if (cause) {
    msg += `\n\x1B[33m Cause: ${cause}\x1B[0m`;
  }
  if (solutions && solutions.length > 0) {
    msg += `\n\x1B[33m Solution:`;
    solutions.forEach((s, i) => { msg += `\n  ${i + 1}. ${s}`; });
    msg += `\x1B[0m`;
  }
  if (rawError) {
    console.error(msg + '\n', rawError);
  } else {
    console.error(msg);
  }
}

module.exports = { printError };
