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

import { add, multiply, greet, stringLength, concatStrings, reverseString, sumArray, createIntArray, callCallback } from 'module_name'

enum TestStatus {
  PENDING = 0,
  RUNNING = 1,
  PASSED = 2,
  FAILED = 3
}

interface TestItem {
  name: string;
  status: TestStatus;
  detail: string;
}

interface TestRunResult {
  passed: boolean;
  detail: string;
}

interface TestCase {
  name: string;
  fn: () => TestRunResult;
}

@Entry
@Component
struct Index {
  @State testItems: TestItem[] = [];
  @State isRunning: boolean = false;
  @State passCount: number = 0;
  @State totalCount: number = 0;

  aboutToAppear(): void {
    this.startTests();
  }

  private buildTestCases(): TestCase[] {
    let cases: TestCase[] = [];

    cases.push({
      name: 'add(3, 5)',
      fn: (): TestRunResult => {
        let r = add(3, 5);
        return { passed: r === 8, detail: `result=${r}, expected=8` };
      }
    });
    cases.push({
      name: 'add(-1, 10)',
      fn: (): TestRunResult => {
        let r = add(-1, 10);
        return { passed: r === 9, detail: `result=${r}, expected=9` };
      }
    });
    cases.push({
      name: 'add(1.5, 2.5)',
      fn: (): TestRunResult => {
        let r = add(1.5, 2.5);
        return { passed: r === 4, detail: `result=${r}, expected=4` };
      }
    });
    cases.push({
      name: 'add(0.1, 0.2)',
      fn: (): TestRunResult => {
        let r = add(0.1, 0.2);
        return { passed: Math.abs(r - 0.3) < 0.0001, detail: `result=${r}, expected=0.3` };
      }
    });
    cases.push({
      name: 'multiply(4, 7)',
      fn: (): TestRunResult => {
        let r = multiply(4, 7);
        return { passed: r === 28, detail: `result=${r}, expected=28` };
      }
    });
    cases.push({
      name: 'multiply(0, 100)',
      fn: (): TestRunResult => {
        let r = multiply(0, 100);
        return { passed: r === 0, detail: `result=${r}, expected=0` };
      }
    });
    cases.push({
      name: 'greet("World")',
      fn: (): TestRunResult => {
        let r = greet('World');
        return { passed: r === 'Hello, World!', detail: `result="${r}"` };
      }
    });
    cases.push({
      name: 'stringLength("hello")',
      fn: (): TestRunResult => {
        let r = stringLength('hello');
        return { passed: r === 5, detail: `result=${r}, expected=5` };
      }
    });
    cases.push({
      name: 'concatStrings("foo", "bar")',
      fn: (): TestRunResult => {
        let r = concatStrings('foo', 'bar');
        return { passed: r === 'foobar', detail: `result="${r}"` };
      }
    });
    cases.push({
      name: 'reverseString("abc")',
      fn: (): TestRunResult => {
        let r = reverseString('abc');
        return { passed: r === 'cba', detail: `result="${r}"` };
      }
    });
    cases.push({
      name: 'sumArray([1,2,3])',
      fn: (): TestRunResult => {
        let r = sumArray([1, 2, 3]);
        return { passed: r === 6, detail: `result=${r}, expected=6` };
      }
    });
    cases.push({
      name: 'createIntArray(0,3)',
      fn: (): TestRunResult => {
        let r = createIntArray(0, 3);
        let expected = [0, 1, 2];
        let pass = r.length === 3 && r[0] === 0 && r[1] === 1 && r[2] === 2;
        return { passed: pass, detail: `result=[${r.join(',')}], expected=[0,1,2]` };
      }
    });
    cases.push({
      name: 'callCallback()',
      fn: (): TestRunResult => {
        let received = '';
        callCallback((msg: string) => {
          received = msg;
        });
        return { passed: received === 'callback invoked', detail: `result="${received}"` };
      }
    });

    return cases;
  }

  private startTests(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    let cases = this.buildTestCases();
    this.totalCount = cases.length;

    let items: TestItem[] = [];
    for (let tc of cases) {
      let item: TestItem = { name: tc.name, status: TestStatus.PENDING, detail: '' };
      items.push(item);
    }
    this.testItems = items;
    this.passCount = 0;

    this.runTestAtIndex(0, cases);
  }

  private runTestAtIndex(index: number, cases: TestCase[]): void {
    if (index >= cases.length) {
      this.isRunning = false;
      return;
    }

    this.updateItemStatus(index, TestStatus.RUNNING, '');

    setTimeout(() => {
      let tc = cases[index];
      let result: TestRunResult;
      try {
        result = tc.fn();
      } catch (e) {
        result = { passed: false, detail: `Exception: ${e}` };
      }

      let newStatus = result.passed ? TestStatus.PASSED : TestStatus.FAILED;
      this.updateItemStatus(index, newStatus, result.detail);
      if (result.passed) {
        this.passCount = this.passCount + 1;
      }

      this.runTestAtIndex(index + 1, cases);
    }, 200);
  }

  private updateItemStatus(index: number, status: TestStatus, detail: string): void {
    let updated: TestItem[] = [];
    for (let i = 0; i < this.testItems.length; i++) {
      if (i === index) {
        let item: TestItem = {
          name: this.testItems[i].name,
          status: status,
          detail: detail
        };
        updated.push(item);
      } else {
        updated.push(this.testItems[i]);
      }
    }
    this.testItems = updated;
  }

  private statusEmoji(status: TestStatus): string {
    if (status === TestStatus.PASSED) {
      return '\u2705';
    } else if (status === TestStatus.FAILED) {
      return '\u274C';
    } else {
      return '\u23F3';
    }
  }

  build() {
    Column() {
      Text('FFI Interface Verification')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 4 })

      Text('Cross-platform FFI native module tests')
        .fontSize(13)
        .fontColor('#888')
        .margin({ bottom: 8 })

      Row() {
        Text(this.isRunning ? '\u23F3 Running...' : `${this.passCount}/${this.totalCount} Passed`)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(
            this.isRunning ? '#2196F3' :
              (this.passCount === this.totalCount && this.totalCount > 0 ? '#4CAF50' : '#F44336')
          )

        if (this.isRunning) {
          LoadingProgress()
            .width(20)
            .height(20)
            .margin({ left: 8 })
            .color('#2196F3')
        }
      }
      .margin({ bottom: 8 })

      Scroll() {
        Column() {
          ForEach(this.testItems, (item: TestItem, index: number) => {
            Row() {
              Text(this.statusEmoji(item.status))
                .fontSize(18)
                .width(36)
                .textAlign(TextAlign.Center)

              Column() {
                Text(item.name)
                  .fontSize(13)
                  .fontWeight(FontWeight.Medium)
                  .fontColor(item.status === TestStatus.PENDING ? '#bbb' : '#222')

                if (item.detail.length > 0) {
                  Text(item.detail)
                    .fontSize(11)
                    .fontColor(item.status === TestStatus.PASSED ? '#4CAF50' : '#888')
                    .maxLines(2)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }

                if (item.status === TestStatus.RUNNING) {
                  Text('running...')
                    .fontSize(11)
                    .fontColor('#2196F3')
                }
              }
              .alignItems(HorizontalAlign.Start)
              .layoutWeight(1)
            }
            .width('100%')
            .padding({ left: 16, right: 16, top: 6, bottom: 6 })
            .alignItems(VerticalAlign.Center)
            .opacity(item.status === TestStatus.PENDING ? 0.5 : 1.0)
          })
        }
        .width('100%')
      }
      .layoutWeight(1)
      .width('100%')

      Row() {
        Button(this.isRunning ? 'Running...' : 'Re-run')
          .width('35%')
          .height(42)
          .margin({ right: 10 })
          .enabled(!this.isRunning)
          .backgroundColor(this.isRunning ? '#ccc' : '#2196F3')
          .onClick(() => {
            this.startTests();
          })
      }
      .margin({ top: 8, bottom: 20 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#fafafa')
  }
}
