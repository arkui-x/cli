import { greet, calculateArea, formatMessage, SampleComponent } from 'module_name'

@Entry
@Component
struct Index {
  @State testResults: string[] = []

  aboutToAppear() {
    this.runTests()
  }

  private check(name: string, actual: string, expected: string) {
    const pass = actual === expected
    this.testResults.push(`[${pass ? 'PASS' : 'FAIL'}] ${name}: "${actual}" ${pass ? '==' : '!='} "${expected}"`)
  }

  private runTests() {
    this.testResults = []
    
    // Test greet
    this.check('greet("World")', greet('World'), 'Hello, World! Welcome to module_name.')
    this.check('greet("ArkUI-X")', greet('ArkUI-X'), 'Hello, ArkUI-X! Welcome to module_name.')
    
    // Test calculateArea
    this.check('calculateArea(10, 20)', String(calculateArea(10, 20)), '200')
    this.check('calculateArea(0, 100)', String(calculateArea(0, 100)), '0')
    
    // Test formatMessage
    this.check('formatMessage("Hi {0}", ["Alice"])', 
      formatMessage('Hi {0}', ['Alice']), 'Hi Alice')
    this.check('formatMessage("{0} + {1}", ["a", "b"])',
      formatMessage('{0} + {1}', ['a', 'b']), 'a + b')
  }

  build() {
    Scroll() {
      Column() {
        Text('Package Interface Verification')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .margin({ bottom: 20 })

        // Show the sample component
        Text('Sample Component Demo:')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .margin({ bottom: 8 })
        SampleComponent({ 
          title: 'module_name Component',
          description: 'This is a sample component from the package.'
        })
        
        Divider().margin({ top: 16, bottom: 16 })

        Text('Test Results:')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .margin({ bottom: 8 })

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
