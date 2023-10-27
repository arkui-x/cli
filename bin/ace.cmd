@rem
@rem Copyright (c) 2022 Huawei Device Co., Ltd.
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem     http://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem

@echo off
setlocal enabledelayedexpansion
call :find_dp0
set "node_version=v16.20.0"
if exist "%dp0%\node.exe" (
    set PATHEXT=%PATHEXT:;.JS;=;%
    call :check_depency
    if !returnValue! == 1 (
        exit /b 1
    ) else if !returnValue! == 2 (
        exit /b 0
    )
    "%dp0%\node.exe" "%dp0%\..\ace_tools\lib\ace_tools.js" %*
    exit /b %errorlevel%
)

node -v >nul 2>nul
if !errorlevel! == 0 (
    set PATHEXT=%PATHEXT:;.JS;=;%
    call :check_depency
    if !returnValue! == 1 (
        exit /b 1
    ) else if !returnValue! == 2 (
        exit /b 0
    )
    node "%dp0%\..\ace_tools\lib\ace_tools.js" %*
    exit /b %errorlevel%
)

echo No Node.js detected, Node.js is a necessary condition for operation.
choice /c yn /m "Do you want to install it?:"
if !errorlevel! == 1 (
    echo start install Node.js(^%node_version%^)
    msiexec /i https://nodejs.org/dist/%node_version%/node-%node_version%-x64.msi
    if not !errorlevel! == 0 (
        echo You have cancelled the installation.
        exit /b %errorlevel%
    )
) else (
    exit /b %errorlevel%
)
set PATHEXT=%PATHEXT:;.JS;=;%
endlocal
echo Refreshing environment variables from system for terminal. Please wait...
%dp0%resetvars.vbs
call "%TEMP%\resetvars.bat"


call :check_depency
if !returnValue! == 1 (
    exit /b 1
) else if !returnValue! == 2 (
    exit /b 0
)
node "%~dp0\..\ace_tools\lib\ace_tools.js" %*
exit /b %errorlevel%
:find_dp0
set dp0=%~dp0
exit /b

:check_depency
if NOT EXIST "%dp0%\..\ace_tools\lib\src" (
    exit /b
)

set missing=
set isMissing=0
cd "%dp0%\..\ace_tools"
for /f "tokens=4 delims= " %%s in ('npm list 2^>nul ^| findstr "UNMET DEPENDENCY"') do (
    set isMissing=2
    set "missing=!missing!echo     %%s&"
)
cd %dp0%
if %isMissing% neq 0 (
    echo Missing following node modules
    %missing%echo.
    choice /c yn /m "Do you want to install them?:"
    if !errorlevel! == 1 (
        echo "executing npm install..."
        cd "%dp0%\..\ace_tools"
        npm install
        if !errorlevel! == 0 (
            set returnValue=0
        ) else (
            set returnValue=1
        )
        cd %dp0%
    ) else (
        set returnValue=2
    )
)
exit /b
