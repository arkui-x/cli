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

export const add: (a: number, b: number) => number;
export const multiply: (a: number, b: number) => number;
export const greet: (name: string) => string;
export const stringLength: (str: string) => number;
export const concatStrings: (a: string, b: string) => string;
export const reverseString: (str: string) => string;
export const sumArray: (arr: number[]) => number;
export const createIntArray: (start: number, count: number) => number[];
export const callCallback: (cb: (msg: string) => void) => void;
export const delayedResult: (ms: number) => Promise<string>;
