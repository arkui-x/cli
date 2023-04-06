import testNapi from 'libentry.so'

export default {
    data: {
        title: "",
        myText: ""
    },
    onInit() {
        this.title = this.$t('strings.world');
    },
    onClick() {
        this.title = testNapi.add(2, 3);
        console.log("Test NAPI 2 + 3 = " + testNapi.add(2, 3));
    }
}