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

import { add, multiply, greet, stringLength, concatStrings, reverseString, sumArray, createIntArray, callCallback, delayedResult } from 'module_name'

@Entry
@Component
struct Index {
  @State results: string[] = []
  @State callbackResult: string = 'pending'
  @State promiseResult: string = 'pending'

  private check(name: string, actual: string, expected: string) {
    const pass = actual === expected
    this.results.push(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${actual} ${pass ? '==' : '!='} ${expected}`)
  }

  private runSyncTests() {
    this.results = []

    this.check('add(3, 5)', String(add(3, 5)), '8')
    this.check('add(-1, 10)', String(add(-1, 10)), '9')

    this.check('multiply(4, 7)', String(multiply(4, 7)), '28')
    this.check('multiply(0, 100)', String(multiply(0, 100)), '0')

    this.check('greet("World")', greet('World'), 'Hello, World!')
    this.check('greet("")', greet(''), 'Hello, !')

    this.check('stringLength("hello")', String(stringLength('hello')), '5')
    this.check('stringLength("")', String(stringLength('')), '0')

    this.check('concatStrings("foo", "bar")', concatStrings('foo', 'bar'), 'foobar')
    this.check('concatStrings("a", "b")', concatStrings('a', 'b'), 'ab')

    this.check('reverseString("abc")', reverseString('abc'), 'cba')
    this.check('reverseString("hello")', reverseString('hello'), 'olleh')

    this.check('sumArray([1,2,3])', String(sumArray([1, 2, 3])), '6')
    this.check('sumArray([])', String(sumArray([])), '0')

    this.check('createIntArray(0,3).join(",")', createIntArray(0, 3).join(','), '0,1,2')
    this.check('createIntArray(5,3).join(",")', createIntArray(5, 3).join(','), '5,6,7')

    this.callbackResult = 'pending'
    callCallback((msg: string) => {
      this.callbackResult = msg
    })
    this.check('callCallback', this.callbackResult, 'callback invoked')
  }

  private async runAsyncTests() {
    this.promiseResult = 'pending'
    try {
      const result = await delayedResult(100)
      this.promiseResult = result
      this.check('delayedResult(100)', this.promiseResult, 'completed after 100 ms')
    } catch (e) {
      this.promiseResult = 'error: ' + String(e)
      this.results.push(`[FAIL] delayedResult(100): ${this.promiseResult}`)
    }
  }

  private async runAllTests() {
    this.runSyncTests()
    await this.runAsyncTests()
  }

  aboutToAppear() {
    this.runAllTests()
  }

  build() {
    Scroll() {
      Column() {
        Text('FFI Interface Verification')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .margin({ bottom: 20 })

        Text('--- Arithmetic ---')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .width('100%')
          .margin({ top: 10, bottom: 4 })

        Text('--- String ---')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .width('100%')
          .margin({ top: 10, bottom: 4 })

        Text('--- Array ---')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .width('100%')
          .margin({ top: 10, bottom: 4 })

        Text('--- Callback ---')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .width('100%')
          .margin({ top: 10, bottom: 4 })

        Text('--- Promise ---')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .width('100%')
          .margin({ top: 10, bottom: 4 })

        Divider().margin({ top: 10, bottom: 10 })

        ForEach(this.results, (result: string, index: number) => {
          Text(result)
            .fontSize(14)
            .fontColor(result.includes('[PASS]') ? Color.Green :
                       result.includes('[FAIL]') ? Color.Red : Color.Blue)
            .width('100%')
            .padding(4)
        }, (result: string, index: number) => `${index}`)

        Button('Run All Tests')
          .margin({ top: 20 })
          .onClick(() => this.runAllTests())
      }
      .width('100%')
      .padding(20)
    }
    .width('100%')
    .height('100%')
  }
}
