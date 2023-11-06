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
set "node_version=v16.20.2"
if exist "%dp0%\node.exe" (
    set "node_path=%dp0%\node.exe"
    call :check_version
    if !returnValue! == 0 (
        set PATHEXT=%PATHEXT:;.JS;=;%
        call :check_depency
        if !returnValue! == 1 (
            exit /b 1
        ) else if !returnValue! == 2 (
            exit /b 0
        )
        "%dp0%\node.exe" "%dp0%\..\ace_tools\lib\ace_tools.js" %*
        exit /b %errorlevel%
    ) else (
        rename "%dp0%\node.exe" "node-old-version.exe"
    )
)

node -v >nul 2>nul
if !errorlevel! == 0 (
    set "node_path=node.exe"
    call :check_version
    if !returnValue! == 0 (
        set PATHEXT=%PATHEXT:;.JS;=;%
        call :check_depency
        if !returnValue! == 1 (
            exit /b 1
        ) else if !returnValue! == 2 (
            exit /b 0
        )
        node "%dp0%\..\ace_tools\lib\ace_tools.js" %*
        exit /b %errorlevel%
    ) else (
        echo The minimum version required for Node.js is %node_version%, the current version is lower than the required version.
    )
) else (
    echo No Node.js detected, Node.js is a necessary condition for operation.
)

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

call :check_version
if !returnValue! neq 0 (
    echo The required version of nodejs has been installed, but the system still uses the lower version by default. Please uninstall or remove the lower version of nodejs from the path and rerun this program.
    exit /b 1
)

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
set bd=%cd%
cd /d "%dp0%\..\ace_tools"
for /f "tokens=4 delims= " %%s in ('npm list 2^>nul ^| findstr "UNMET DEPENDENCY"') do (
    set isMissing=2
    set "missing=!missing!echo     %%s&"
)
cd /d %bd%
if %isMissing% neq 0 (
    echo Missing following node modules
    %missing%echo.
    choice /c yn /m "Do you want to install them?:"
    if !errorlevel! == 1 (
        echo "executing npm install..."
        cd /d "%dp0%\..\ace_tools"
        npm install
        if !errorlevel! == 0 (
            set returnValue=0
        ) else (
            set returnValue=1
        )
        cd /d %dp0%
    ) else (
        set returnValue=2
    )
)
exit /b

:check_version
for /f %%v in ('%node_path% -v 2^>^&1') do (
    set "current_version=%%v"
    set "current_version_num=!current_version:~1,10!"
    set "required_version_num=!node_version:~1,10!"
)
for /f  %%c in ("!current_version_num!") do (
    for /f "tokens=1 delims=." %%r in ("!required_version_num!") do (
        if %%c lss %%r (
            set returnValue=1
            exit /b
        )
        if %%c gtr %%r (
            set returnValue=0
            exit /b
        )
    )
)
for /f  %%c in ("!current_version_num!") do (
    for /f "tokens=2 delims=." %%r in ("!required_version_num!") do (
        if %%c lss %%r (
            set returnValue=1
            exit /b
        )
        if %%c gtr %%r (
            set returnValue=0
            exit /b
        )
    )
)
for /f  %%c in ("!current_version_num!") do (
    for /f "tokens=3 delims=." %%r in ("!required_version_num!") do (
        if %%c lss %%r (
            set returnValue=1
            exit /b
        )
        if %%c gtr %%r (
            set returnValue=0
            exit /b
        )
    )
)
set returnValue=0
exit /b
