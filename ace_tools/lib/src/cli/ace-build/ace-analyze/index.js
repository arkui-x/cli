/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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

const path = require('path');
const fs = require('fs');
const projectDir = process.cwd();
const JSZip = require("./json/jszip.min.js");
const exec = require('child_process').exec;
const express = require('../../../../../node_modules/express');
const ejs = require('../../../../../node_modules/ejs');
const net = require('net');
const archiver = require('../../../../../node_modules/archiver')

function analyze(fileType) {
    let packSrc = "";
    if (fileType === "apk") {
        let filePath = `${projectDir}/.arkui-x/android/app/build/outputs/${fileType}/release/app-release.apk`;
        if(fs.existsSync(filePath)) {
            packSrc = `${projectDir}/.arkui-x/android/app/build/outputs/${fileType}/release/app-release.apk`;
        } else {
            packSrc = `${projectDir}/.arkui-x/android/app/build/outputs/${fileType}/release/app-release-unsigned.apk`;
        }
		readJsonFile(packSrc,fileType);
    } else if (fileType === "hap") {
        packSrc = `${projectDir}/entry/build/default/outputs/default/entry-default-signed.hap`;
		readJsonFile(packSrc,fileType);
    } else if (fileType === "ios") {
        folderPath = `${projectDir}/.arkui-x/ios/build/outputs/ios/app.app`;
		destPath = `${projectDir}/.arkui-x/ios/build/outputs/ios/app.zip`;
		packSrc = destPath
		const output = fs.createWriteStream(`${destPath}`);
		const archive = archiver('zip', {
		    zlib: { level: 9 }
		});
		output.on('close', function() {
		    console.log('archiver has been finalized and the output file descriptor has closed.');
			readJsonFile(packSrc,fileType);
		});
		output.on('end', function() {
		    console.log('Data has been drained');
		});
		archive.pipe(output);
		archive.directory(folderPath, false);
		archive.finalize();
    }
}

function readJsonFile(packSrc,fileType){
	fs.readFile(packSrc, function (err, data) {
	    if (err){
            console.log("\x1b[33m%s\x1b[0m",'WARN: Unable to support analyzing package size for unsigned HAP.\nIf needed,configure the signingConfigs in '+`${projectDir}\build-profile.json5`);
            return false;
        }
	    JSZip.loadAsync(data)
	        .then(function (zip) {
	            apkTojson(zip,fileType) ;
	            writeJsonFile(fileType);
	            renderHtmlPage();
	        })
	        .catch(function (error) {
	            console.error('Decompression failed:', error);
	        });
	});
}

function apkTojson(zip,fileType) {
    root = {}
    root.n = "root";
    root.value = 0;
    root.type = fileType;
    zip.forEach(function (relativePath, zipEntry) {
        let filename = zipEntry.name;
        let filevalue = zipEntry._data.uncompressedSize || 0;
        createdJson(filename, filevalue);
    });
}

function createdJson(filename, filevalue = 0) {
    let filenameArr = filename.split('/');
    let index = 0;
    createChildren(root, filenameArr[index])
    function createChildren(root, name) {
		if (name.length != 0) {
			let obj = {};
			obj.n = name;
			if (index == filenameArr.length - 1) {
			    obj.value = filevalue;
			}
			let checkroot = checkList(root, filenameArr[index])
			if (checkroot) {
			    index++;
			    createChildren(checkroot, filenameArr[index]);
			} else {
			    if (!root.children) {
			        root.children = [];
			    }
			    root.children.push(obj);
			    index++;
			    if (index < filenameArr.length) {
			        createChildren(root.children[root.children.length - 1], filenameArr[index]);
			    }
			}
		}
    }
}

function checkList(checkroot, item) {
    if (checkroot.children) {
        for (let i = 0; i < checkroot.children.length; i++) {
            if (checkroot.children[i].n == item) {
                return checkroot.children[i];
            }
        }
        return false;
    }
}

function writeJsonFile(fileType) {
    root = typeof root === 'object' ? JSON.stringify(root, undefined, 4) : root;
    const analyzeFileSaveUrl = analyzeFile(fileType);
    fs.writeFile(analyzeFileSaveUrl, root, err => {
        if (!err) {
            console.log("A summary of your APK analysis can be found at:", analyzeFileSaveUrl);
        } else {
            console.log(err);
        }
    })
}

function analyzeFile(fileType) {
    const user_home = process.env.HOME || process.env.USERPROFILE;
    mkDirsSync(user_home + "/.ace-devtools/" + fileType);
    analyzeFileUrl = user_home + "/.ace-devtools/" + fileType;
    const files = fs.readdirSync(analyzeFileUrl);
    analyzeFileName = "/" + fileType + "-code-size-analysis_" + ((files.length + 1) >= 10 ? (files.length + 1) : ('0' + (files.length + 1))) + '.json';
    return analyzeFileUrl + analyzeFileName;
}

function mkDirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkDirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

function renderHtmlPage() {
    app = express();
    app.set('views', path.join(__dirname, '/json'));
    app.engine('html', ejs.__express);
    app.set('view engine', 'html');
    app.get('/appsize', function (request, response) {
        const ReqJsonPath = request.query.appSizeBase ? request.query.appSizeBase : '';
        if (ReqJsonPath) {
            fs.readFile(ReqJsonPath, 'utf-8', (err, data) => {
                response.render(path.join(__dirname, '/json/index.html'), {
                    jsonPath: !err ? JSON.stringify(data) : "", totalSizeAnalyze: ReqJsonPath,
                });
            });
        }
    });
    app.get('/', function (request, response) {
        fs.readFile(analyzeFileUrl + analyzeFileName, 'utf-8', (err, data) => {
            response.render(path.join(__dirname, '/json/index.html'), {
                jsonPath: !err ? JSON.stringify(root) : "", totalSizeAnalyze: analyzeFileUrl + analyzeFileName,
            });
        });
    });
    portUsable()
    app.use(express.static(path.join(__dirname, '/json')));
}

function portUsable(port = 3000){
    checkPort(port)
    .then((isAvailable) => {
        if (isAvailable) {
            console.log('http://127.0.0.1:' + port);
            app.listen(port);
            openHtmlInBrowser(port);
        } else {
            port++;
            portUsable(port);
        }
    })
    .catch((err) => {
        console.error(err);
    });
}

function checkPort(port) {
    const server = net.createServer();
    return new Promise((resolve, reject) => {
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                reject(err);
            }
        });
        server.once('listening', () => {
            server.close(() => {
                resolve(true);
            });
        });
        server.listen(port);
    });
}

function openHtmlInBrowser(port) {
    const openDefaultBrowser = function (url) {
        switch (process.platform) {
            case "darwin":
                exec('open ' + url);
                break;
            case "win32":
                exec('start ' + url);
                break;
            default:
                exec('xdg-open', [url]);
        }
    }
    openDefaultBrowser("http://127.0.0.1:" + port + '/appsize?appSizeBase=' + analyzeFileUrl + analyzeFileName);
    port++;
}

module.exports = analyze;