const fs = require('fs');
const path = require('path');
const { Platform, platform } = require('../ace-check/platform');
const { getConfig } = require('../ace-config');
const { sourceDirPathCheck } = require('../ace-check/checkPathLawful');

function checkPlatform() {
  if (platform === Platform.Windows) {
    return 'windows';
  } else if (platform === Platform.MacOS) {
    return 'darwin';
  } else {
    return 'linux';
  }
}

function getSourceDir() {
  const config = getConfig();
  if (config && config['source-dir'] && sourceDirPathCheck(config['source-dir'])) {
    return config['source-dir'];
  }
  return false;
}

function getSourceArkuixVersion() {
  if (getSourceArkuixPath()) {
    return JSON.parse(fs.readFileSync(path.join(getSourceArkuixPath(), 'arkui-x.json')))['version'];
  }
  return 'unknown';
}

function getSourceArkuixPath() {
  const host = checkPlatform();
  const sourceDirArkuixPath = `out/arkui-x/arkui-x/${host}/arkui-x`;
  const sourceDir = getSourceDir();
  if (!sourceDir || !fs.existsSync(path.join(sourceDir, sourceDirArkuixPath))) {
    return false;
  }
  return path.join(sourceDir, sourceDirArkuixPath);
}

module.exports = {
  checkPlatform,
  getSourceDir,
  getSourceArkuixPath,
  getSourceArkuixVersion,
};

