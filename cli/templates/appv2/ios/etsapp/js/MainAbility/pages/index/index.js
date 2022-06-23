/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!****************************************************************************************************************************************!*\
  !*** ../../../../../../../workspace/arkui-cross/samples/eTSHelloWorld/ohos/entry/src/main/ets/MainAbility/pages/index/index.ets?entry ***!
  \****************************************************************************************************************************************/
class Index extends View {
    constructor(compilerAssignedUniqueChildId, parent, params) {
        super(compilerAssignedUniqueChildId, parent);
        this.__message = new ObservedPropertySimple('World', this, "message");
        this.updateWithValueParams(params);
    }
    updateWithValueParams(params) {
        if (params.message !== undefined) {
            this.message = params.message;
        }
    }
    aboutToBeDeleted() {
        this.__message.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id());
    }
    get message() {
        return this.__message.get();
    }
    set message(newValue) {
        this.__message.set(newValue);
    }
    render() {
        Row.create();
        Row.height('100%');
        Column.create();
        Column.width('100%');
        Text.create('Hello ' + this.message);
        Text.fontSize(50);
        Text.fontWeight(FontWeight.Bold);
        Text.pop();
        Button.createWithChild();
        Button.type(ButtonType.Capsule);
        Button.margin({
            top: 25
        });
        Button.backgroundColor(Color.Yellow);
        Button.width('35%');
        Button.height(50);
        Button.onClick(() => {
            this.message = 'ArkUI';
        });
        Text.create(' Click me ');
        Text.fontSize(25);
        Text.pop();
        Button.pop();
        Column.pop();
        Row.pop();
    }
}
loadDocument(new Index("1", undefined, {}));

/******/ })()
;
//# sourceMappingURL=index.js.map