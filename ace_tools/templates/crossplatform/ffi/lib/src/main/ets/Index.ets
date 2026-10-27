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

import nativeModule from 'libmodule_name.so'

export const add: (a: number, b: number) => number = nativeModule.add
export const multiply: (a: number, b: number) => number = nativeModule.multiply
export const greet: (name: string) => string = nativeModule.greet
export const stringLength: (s: string) => number = nativeModule.stringLength
export const concatStrings: (a: string, b: string) => string = nativeModule.concatStrings
export const reverseString: (s: string) => string = nativeModule.reverseString
export const sumArray: (arr: number[]) => number = nativeModule.sumArray
export const createIntArray: (start: number, size: number) => number[] = nativeModule.createIntArray
export const callCallback: (cb: (result: string) => void) => void = nativeModule.callCallback
export const delayedResult: (ms: number) => Promise<string> = nativeModule.delayedResult
