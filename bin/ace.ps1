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

function ExistNodeJs {
    $nodeExecutable = "node.exe"
    $path = [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::Machine)
    $nodeExists = $path -split ";" | Where-Object { Test-Path (Join-Path $_ $nodeExecutable) }

    if ($nodeExists) {
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
if (Test-Path "$basedir/node$exe") {
    CheckDepency
    & "$basedir/node$exe"  "$basedir/../ace_tools/lib/ace_tools.js" $args
    $ret=$LASTEXITCODE
} else {
    if (ExistNodeJs) {
        CheckDepency
        & "node$exe" "$basedir/../ace_tools/lib/ace_tools.js" $args
        $ret=$LASTEXITCODE
    } else {
        $node_version="v16.20.0"
        Write-Host "No Node.js detected, Node.js is a necessary condition for operation."
        choice /c yn /m "Do you want to install it:"
        if ($LASTEXITCODE -eq 1) {
            $message = "start install Node.js(" + $node_version + ")"
            Write-Host $message
            $msiurl = "https://nodejs.org/dist/"+$node_version+"/node-"+$node_version+"-x64.msi"
            $process = Start-Process "msiexec" -ArgumentList "/i $msiurl" -Wait -PassThru
            if ($process.ExitCode -eq 0) {
                Write-Host "Refreshing environment variables from system for terminal. Please wait..."
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
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
    }
}
exit $ret
