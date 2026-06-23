@Component
export struct SampleComponent {
  @Prop title: string = 'Sample Component'
  @Prop description: string = ''

  build() {
    Column() {
      Text(this.title)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 8 })
      
      if (this.description) {
        Text(this.description)
          .fontSize(14)
          .fontColor('#666666')
      }
    }
    .padding(16)
    .borderRadius(8)
    .backgroundColor('#F5F5F5')
    .width('100%')
  }
}
