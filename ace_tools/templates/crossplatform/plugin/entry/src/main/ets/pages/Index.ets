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

import { add, log, getSystemVersion, getFullOSName, getDeviceType } from 'module_name'

@Entry
@Component
struct Index {
  @State testResults: string[] = []
  @State logOutput: string = ''

  aboutToAppear() {
    this.runTests()
  }

  private check(name: string, actual: string, expected: string) {
    const pass = actual === expected
    this.testResults.push(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${actual} ${pass ? '==' : '!='} ${expected}`)
  }

  private runTests() {
    this.testResults = []
    // Test add
    this.check('add(10, 20)', String(add(10, 20)), '30')
    this.check('add(-5, 15)', String(add(-5, 15)), '10')
    
    // Test log (check no crash)
    log('Hello from Plugin!')
    this.testResults.push('[INFO] log() called successfully')
    
    // Test getSystemVersion — check it returns non-empty string
    const version = getSystemVersion()
    this.testResults.push(`[INFO] getSystemVersion(): "${version}"`)
    
    // Test getFullOSName — check it returns non-empty string
    const osName = getFullOSName()
    this.testResults.push(`[INFO] getFullOSName(): "${osName}"`)
    
    // Test getDeviceType — check it returns non-empty string
    const deviceType = getDeviceType()
    this.testResults.push(`[INFO] getDeviceType(): "${deviceType}"`)
  }

  build() {
    Scroll() {
      Column() {
        Text('Plugin Interface Verification')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .margin({ bottom: 20 })

        ForEach(this.testResults, (result: string, index: number) => {
          Text(result)
            .fontSize(14)
            .fontColor(result.includes('[PASS]') ? Color.Green : 
                       result.includes('[FAIL]') ? Color.Red : Color.Blue)
            .width('100%')
            .padding(4)
        }, (result: string, index: number) => `${index}`)

        Button('Re-run Tests')
          .margin({ top: 20 })
          .onClick(() => this.runTests())
      }
      .width('100%')
      .padding(20)
    }
    .width('100%')
    .height('100%')
  }
}
