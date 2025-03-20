const { searchApi} = require('./searchApi');

function analysisProject(sdkPath) {
    searchApi(sdkPath);
}

module.exports = { analysisProject };