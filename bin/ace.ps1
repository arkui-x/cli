#!/usr/bin/env pwsh
# Copyright (c) 2022 Huawei Device Co., Ltd.
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent
$exe=""
$node_version="v16.20.1"

function ExistNodeJs {
    $nodeExecutable = "node.exe"
    $path = $env:path
    $nodeExists = $path.TrimEnd(";+") -split ";+" | Where-Object { Test-Path (Join-Path $_ $nodeExecutable) }

    if ($nodeExists) {
        return $true
    } else {
        return $false
    }
}

function CheckVersion () {
    param (
        [string]$nodePath
    )
    if ($nodePath -eq "") {
        $nodePath = "node$exe"
    }
    $currentVersion = & $nodePath -v
    if ([version]($currentVersion.Trim('v')) -ge [version]$node_version.Trim('v')) {
        return $true
    } else {
        return $false
    }
}

function CheckDepency {
    if (-Not (Test-Path "$basedir/../ace_tools/lib/src" -PathType Container)) {
        return
    }
    $bd = pwd
    cd $basedir/../ace_tools
    $missing=($(npm list 2>$null | Select-String 'UNMET DEPENDENCY' | Foreach {($_ -split '\s+',4)[3]}))
    cd $bd
    if ($missing) {
        echo "Missing following node modules"
        foreach ($m in $missing){
            echo "    $m"
        }
        choice /c yn /m "Do you want to install them:"
        if ($LASTEXITCODE -eq 1) {
            echo "executing npm install..."
            cd $basedir/../ace_tools
            npm install
            cd $bd
            $ret=$LASTEXITCODE
            cd $bd
            if ($ret -ne 0){
                exit $ret
            }
        } else {
            exit 0
        }
    }
}

if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
    # Fix case when both the Windows and Linux builds of Node
    # are installed in the same directory
    $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node.exe") {
    $ret = CheckVersion -nodePath $basedir/node$exe
    if ($ret -eq $True) {
        $Env:path = "$($Env:path):$basedir"
        CheckDepency
        & "$basedir/node$exe"  "$basedir/../ace_tools/lib/ace_tools.js" $args
        exit $LASTEXITCODE
    } else {
        Rename-item $basedir/node.exe -NewName node-old-version.exe
    }
}

if (ExistNodeJs) {
    $ret = CheckVersion
    if ($ret -eq $True) {
        CheckDepency
        & "node$exe" "$basedir/../ace_tools/lib/ace_tools.js" $args
        exit $LASTEXITCODE
    } else {
        Write-Host "The minimum version required for Node.js is $node_version, the current version is lower than the required version."
    }
} else {
    Write-Host "No Node.js detected, Node.js is a necessary condition for operation."
}

choice /c yn /m "Do you want to install it:"
if ($LASTEXITCODE -eq 1) {
    $message = "start install Node.js(" + $node_version + ")"
    Write-Host $message
    $msiurl = "https://nodejs.org/dist/"+$node_version+"/node-"+$node_version+"-x64.msi"
    $process = Start-Process "msiexec" -ArgumentList "/i $msiurl" -Wait -PassThru
    if ($process.ExitCode -eq 0) {
        Write-Host "Refreshing environment variables from system for terminal. Please wait..."
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $ret = CheckVersion
        if ($ret -eq $False) {
            echo "The required version of nodejs has been installed, but the system still uses the lower version by default. Please uninstall or remove the lower version of nodejs from the path and rerun this program."
            exit 1
        }
        CheckDepency
        & "node$exe" "$basedir/../ace_tools/lib/ace_tools.js" $args
        $ret=$LASTEXITCODE
    } else {
        Write-Host "You have cancelled the installation."
        $ret=$LASTEXITCODE
    }
} else {
    $ret=$LASTEXITCODE
}

exit $ret
