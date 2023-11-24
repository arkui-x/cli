const path = require('path');
const fs = require('fs');
const projectDir = process.cwd();
const JSZip = require("./jszip.min.js");
const exec = require('child_process').exec;
const express = require('../../../../../node_modules/express');
const ejs = require('../../../../../node_modules/ejs');
const net = require('net');
var port = 3000;
var analyzeFileUrl = "";
var analyzeFileName = "";
let packSrc;
let root = {} //存放json文件中保存的数据
function analyze(fileType) {
    if (fileType === "apk") {
        let filePath = `${projectDir}/.arkui-x/android/app/build/outputs/${fileType}/release/app-release.apk`
        if(fs.existsSync(filePath)) {
            packSrc = `${projectDir}/.arkui-x/android/app/build/outputs/${fileType}/release/app-release.apk`
        } else {
            packSrc = `${projectDir}/.arkui-x/android/app/build/outputs/${fileType}/release/app-release-unsigned.apk`
        }
    } else if (fileType === "hap") {
        packSrc = `${projectDir}/entry/build/default/outputs/default/entry-default-signed.hap`
    } else if (fileType === "app") {
        packSrc = `${projectDir}/.arkui-x/ios/build/outputs/ios/app.app`
    }
    fs.readFile(packSrc, function (err, data) {
        if (err) throw err;
        JSZip.loadAsync(data)
            .then(function (zip) {
                apkTojson(zip,fileType) 
                writeJsonFile(fileType)
                renderHtmlPage() 
            })
            .catch(function (error) {
                console.error('解压缩失败:', error);
            });
    });

}
// 读取apk包，生成json数据
function apkTojson(zip,fileType) {
    root.n = "root";
    root.value = 0;
    root.type = fileType;
    zip.forEach(function (relativePath, zipEntry) {
        let filename = zipEntry.name;
        let filevalue = zipEntry._data.uncompressedSize || 0
        createdJson(filename, filevalue)
    });
}
// 创建json数据
function createdJson(filename, filevalue = 0) {
    let filenameArr = filename.split('/')
    let index = 0
    createChildren(root, filenameArr[index])
    function createChildren(root, name) {
        let obj = {}
        obj.n = name
        if (index == filenameArr.length - 1) {
            obj.value = filevalue
        }
        let checkroot = checkList(root, filenameArr[index])
        if (checkroot) {
            index++;
            createChildren(checkroot, filenameArr[index])
        } else {
            if (!root.children) {
                root.children = []
            }
            root.children.push(obj)
            index++;
            if (index < filenameArr.length) {
                createChildren(root.children[root.children.length - 1], filenameArr[index])
            }
        }
    }
}
// 检查是否已经存在目录
function checkList(checkroot, item) {
    if (checkroot.children) {
        for (let i = 0; i < checkroot.children.length; i++) {
            if (checkroot.children[i].n == item) {
                return checkroot.children[i]
            }
        }
        return false
    }
}
// 将json数据写入json文件并保存到本地
function writeJsonFile(fileType) {
    root = typeof root === 'object' ? JSON.stringify(root, undefined, 4) : root
    const analyzeFileSaveUrl = analyzeFile(fileType)
    fs.writeFile(analyzeFileSaveUrl, root, err => {
        if (!err) {
            console.log("A summary of your APK analysis can be found at:", analyzeFileSaveUrl)
        } else {
            console.log(err)
        }
    })
}
// json文件保存位置及名称
function analyzeFile(fileType) {
    const user_home = process.env.HOME || process.env.USERPROFILE
    mkDirsSync(user_home + "\\.ace-devtools\\" + fileType)
    analyzeFileUrl = user_home + "\\.ace-devtools\\" + fileType
    const files = fs.readdirSync(analyzeFileUrl);
    analyzeFileName = "\\" + fileType + "-code-size-analysis_" + ((files.length + 1) >= 10 ? (files.length + 1) : ('0' + (files.length + 1))) + '.json'
    return analyzeFileUrl + analyzeFileName
}
// 创建文件夹目录
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
// 渲染html页面
function renderHtmlPage() {
    app = express();
    app.set('views', path.join(__dirname, '\\json'));
    app.engine('html', ejs.__express);
    app.set('view engine', 'html')
    app.get('/appsize', function (request, response) {
        const ReqJsonPath = request.query.appSizeBase ? request.query.appSizeBase : '';
        if (ReqJsonPath) {
            fs.readFile(ReqJsonPath, 'utf-8', (err, data) => {
                response.render(path.join(__dirname, '\\json\\index.html'), {
                    jsonPath: !err ? JSON.stringify(data) : "", totalSizeAnalyze: ReqJsonPath
                });
            });
        }
    });
    app.get('/', function (request, response) {
        fs.readFile(analyzeFileUrl + analyzeFileName, 'utf-8', (err, data) => {
            response.render(path.join(__dirname, '\\json\\index.html'), {
                jsonPath: !err ? JSON.stringify(root) : "", totalSizeAnalyze: analyzeFileUrl + analyzeFileName
            });
        });
    });
    portusable()
    app.use(express.static(path.join(__dirname, '\\json')));
}
function portusable(){
    checkPort(port)
    .then((isAvailable) => {
        if (isAvailable) {
            console.log('http://127.0.0.1:' + port);
            app.listen(port);
            openHtmlInBrowser(port)
        } else {
            port++;
            portusable()
        }
    })
    .catch((err) => {
        console.error(err);
    });
}
// 获取正在监听的端口
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
// 在浏览器打开html文件
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
    openDefaultBrowser("http://127.0.0.1:" + port + '/appsize?appSizeBase=' + analyzeFileUrl + analyzeFileName)
    port++
}
module.exports = analyze;