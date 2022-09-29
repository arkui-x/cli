/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
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

@Entry
@Component
struct Index {
  @State message:string = 'World'
  build() {
    Row() {
      Column() {
        Text('Hello ' + this.message)
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
        Button() {
          Text(' Click me ')
            .fontSize(25)
        }
        .type(ButtonType.Capsule)
        .margin({
          top: 25
        })
        .backgroundColor(Color.Yellow)
        .width('35%')
        .height(50)
        .onClick(() => {
          this.message = 'ArkUI'
        })
      }
      .width('100%')
    }
    .height('100%')
  }
}