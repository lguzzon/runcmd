@ECHO OFF
:: ===================================================================================
:: runcmd.bat - Universal script runner for JavaScript, TypeScript, and Python files
:: ===================================================================================
:: FEATURES:
::   - Automatic Bun installation and management
::   - Environment variable loading from .env files
::   - Debug mode support (+d, +dd, +ddd, +d0)
::   - Multiple file format support (.js, .mjs, .ts, .py)
::   - Flexible script discovery (current directory, script directory, explicit paths)
::   - Environment variable listing (+e option)
::   - Custom environment file support (--env option)
:: ===================================================================================

:: ===================================================================================
:: INITIALIZATION SECTION
:: ===================================================================================
CALL :initialize_environment

:: Enable delayed variable expansion for complex string operations
SETLOCAL ENABLEDELAYEDEXPANSION

:: Parse debug arguments and collect remaining args
set "args_after_debug="
CALL :parse_debug_mode_and_collect %*
CALL :configure_output_redirection

:: Update Check
CALL :check_for_updates

ECHO Debug=%DEBUG% %ECHO_TO_NUL%

ECHO Starting ... %ECHO_TO_NUL%
CALL :main !args_after_debug!
ECHO ... finished!!! %ECHO_TO_NUL%

:: Restore original DEBUG state and exit
ENDLOCAL & SET "DEBUG=%OLD_DEBUG%" & EXIT /B %ERRORLEVEL%

:: ===================================================================================
:: INITIALIZATION FUNCTIONS
:: ===================================================================================

:initialize_environment
    :: Initialize environment variables and output redirection
    SET "OLD_DEBUG=%DEBUG%"
    SET "TO_NUL= > nul 2> nul"
    SET "ECHO_TO_NUL= > nul 2> nul"
    EXIT /B 0

:parse_debug_mode_and_collect
    :: Parse debug mode arguments and collect remaining arguments
    :: Arguments: +d (basic), +dd (with file), +ddd (full echo), +d0 (disable)
    :debug_parse_loop
        IF "%~1" == "" GOTO :debug_parse_done
        IF /I "%~1" == "+d" (
            SET "DEBUG=1"
            SHIFT
            GOTO :debug_parse_loop
        )
        IF /I "%~1" == "+dd" (
            SET "DEBUG=2"
            SHIFT
            GOTO :debug_parse_loop
        )
        IF /I "%~1" == "+ddd" (
            SET "DEBUG=3"
            SET ECHO=ON
            SHIFT
            GOTO :debug_parse_loop
        )
        IF /I "%~1" == "+d0" (
            SET "DEBUG="
            SHIFT
            GOTO :debug_parse_loop
        )
        :: Not a debug flag, collect remaining arguments
        GOTO :debug_parse_done
    :debug_parse_done
        :: Now collect all remaining arguments
    :args_collect_loop
        IF "%~1" == "" GOTO :args_collect_done
        SET "args_after_debug=!args_after_debug! %1"
        SHIFT
        GOTO :args_collect_loop
    :args_collect_done
    EXIT /B 0

:configure_output_redirection
    :: Configure output redirection based on debug level
    :: Level 3: Full echo on, no redirection
    :: Level 2: No redirection for file operations
    :: Level 1: No redirection for echo output
    :: Level 0/empty: Full redirection for quiet operation
    IF "%DEBUG%" == "3" (
        ECHO ON
        SET "TO_NUL="
        SET "ECHO_TO_NUL="
    ) ELSE IF "%DEBUG%" == "2" (
        SET "TO_NUL="
        SET "ECHO_TO_NUL="
    ) ELSE IF "%DEBUG%" == "1" (
        SET "ECHO_TO_NUL="
    )
    EXIT /B 0


:: ===================================================================================
:: MAIN EXECUTION SECTION
:: ===================================================================================

:main
    :: Main function that handles script execution logic
    :: Sets up environment variables and coordinates script discovery
    CALL :setup_paths
    CALL :load_default_env_files
    CALL :ensure_bun

    CALL :handle_special_options %*
    IF !ERRORLEVEL! EQU 99 EXIT /B 0
    IF !ERRORLEVEL! NEQ 0 EXIT /B !ERRORLEVEL!

    CALL :process_main_arguments %*

    CALL :attempt_script_execution
    EXIT /B !ERRORLEVEL!

:: ===================================================================================
:: PATH AND ENVIRONMENT SETUP FUNCTIONS
:: ===================================================================================

:setup_paths
    :: Initialize script paths and directories
    SET "DEFAULT_SCRIPT_NAME=%~n0"
    SET "SCRIPT_DIR=%~dp0"
    SET "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
    SET "CWD=%CD%"
    SET "BUN_INSTALL_DIR=%USERPROFILE%\.bun\bin"
    EXIT /B 0

:load_default_env_files
    :: Load environment variables from default locations
    CALL :load_env "%SCRIPT_DIR%\.env"
    CALL :load_env "%CWD%\.env"
    EXIT /B 0

:load_env
    :: Load environment variables from a .env file
    :: Parameter: %1 - Path to .env file
    :: Skips: empty lines, comments (#), lines without values
    SET "env_file=%~1"
    IF NOT EXIST "!env_file!" EXIT /B 0

    FOR /F "usebackq tokens=1,* delims==" %%a IN ("!env_file!") DO (
        SET "line=%%a"
        SET "value=%%b"
        IF NOT "!line!" == "" IF NOT "!line:~0,1!" == "#" IF NOT "!value!" == "" (
            SET "!line!=!value!"
        )
    )
    EXIT /B 0

:: ===================================================================================
:: ARGUMENT PROCESSING FUNCTIONS
:: ===================================================================================

:handle_special_options
    :: Handle special command line options (+e, --env)
    SET "first_arg=%~1"
    SET "needs_custom_env=0"
    SET "exit_please=0"

    :: Handle environment variable listing
    IF /I "%first_arg%" == "+e" (
        SET
        EXIT /B 99
    )

    :: Handle custom environment file
    IF /I "%first_arg%" == "-e" SET "needs_custom_env=1"
    IF /I "%first_arg%" == "--env" SET "needs_custom_env=1"

    IF "!needs_custom_env!" == "1" (
        SET "custom_env=%~2"
        IF "!custom_env!" == "" (
            CALL :show_error "--env option requires a file path"
            ECHO Usage: runcmd.bat --env /path/to/custom.env
            EXIT /B 1
        )
        CALL :load_env "!custom_env!"
        SHIFT
        SHIFT
    )
    EXIT /B 0

:process_main_arguments
    :: Process and collect main arguments for script execution
    SET "main_args="
    SET "first_arg=%~1"
    :process_main_args_loop
        IF "%~1" == "" GOTO :process_main_args_done
        SET "main_args=!main_args! %1"
        SHIFT
        GOTO :process_main_args_loop
    :process_main_args_done
    EXIT /B 0

:: ===================================================================================
:: SCRIPT EXECUTION FUNCTIONS
:: ===================================================================================

:attempt_script_execution
    :: Attempt to find and execute script in various locations
    :: Try current working directory first
    CALL :find_and_execute "%CWD%\!DEFAULT_SCRIPT_NAME!" !main_args!
    IF "!exit_please!" == "1" EXIT /B !ERRORLEVEL!

    :: Try script directory
    CALL :find_and_execute "%SCRIPT_DIR%\!DEFAULT_SCRIPT_NAME!" !main_args!
    IF "!exit_please!" == "1" EXIT /B !ERRORLEVEL!

    :: Check if first argument is a file path
    CALL :is_file "!first_arg!"
    IF !ERRORLEVEL! EQU 0 (
        SHIFT
        CALL :execute_file !main_args!
        EXIT /B !ERRORLEVEL!
    )

    :: No script found - show error
    CALL :show_error "No script found to execute"
    ECHO Args: !main_args!
    PAUSE
    EXIT /B 1

:find_and_execute
    :: Find and execute script with supported extensions
    :: Parameter: %1 - Base path, %2+ - Arguments
    SET "base_path=%~1"
    SHIFT
    
    :: Collect remaining arguments after shift
    SET "remaining_args="
    :find_args_loop
        IF "%~1" == "" GOTO :find_args_done
        SET "remaining_args=!remaining_args! %1"
        SHIFT
        GOTO :find_args_loop
    :find_args_done

    :: Try each supported extension
    FOR %%E IN (js mjs ts py) DO (
        IF EXIST "!base_path!.%%E" (
            CALL :execute_file "!base_path!.%%E" !remaining_args!
            SET "exit_please=1"
            EXIT /B !ERRORLEVEL!
        )
    )
    EXIT /B 0

:execute_file
    :: Execute a script file based on its extension
    :: Parameter: %1 - File path, %2+ - Arguments
    SET "file_path=%~1"
    FOR /F %%i IN ("!file_path!") DO SET "file_ext=%%~xi"
    SHIFT
    
    :: Collect remaining arguments after shift
    SET "remaining_args="
    :exec_args_loop
        IF "%~1" == "" GOTO :exec_args_done
        SET "remaining_args=!remaining_args! %1"
        SHIFT
        GOTO :exec_args_loop
    :exec_args_done

    :: Map extension to executor
    IF /I "!file_ext!" == ".js" GOTO :execute_with_bun
    IF /I "!file_ext!" == ".mjs" GOTO :execute_with_bun
    IF /I "!file_ext!" == ".ts" GOTO :execute_with_bun
    IF /I "!file_ext!" == ".py" GOTO :execute_with_python

    :: Unsupported file type
    CALL :show_error "Unsupported file type: !file_ext!"
    ECHO Supported extensions: .js, .mjs, .ts, .py
    EXIT /B 1

:execute_with_bun
    IF NOT defined BUN_CMD (
        CALL :ensure_bun
    )
    IF defined BUN_CMD (
        CALL !BUN_CMD! run "!file_path!" !remaining_args!
    ) ELSE (
        CALL bun run "!file_path!" !remaining_args!
    )
    EXIT /B !ERRORLEVEL!

:execute_with_python
    CALL CMD /C "mise exec -y -q python@latest -- python !file_path! !remaining_args!"
    EXIT /B !ERRORLEVEL!

:: ===================================================================================
:: TOOL INSTALLATION FUNCTIONS
:: ===================================================================================

:ensure_bun
    :: Ensure Bun is available for JavaScript/TypeScript execution
    :: Attempts: PATH lookup -> local installation -> auto-install
    ECHO Checking for 'bun'... %TO_NUL%

    :: Check system PATH
    FOR /F "usebackq delims=" %%I IN (`where bun 2^>nul`) DO (
        SET "BUN_CMD=%%~fI"
        GOTO :bun_found
    )

    :: Check local installation
    IF EXIST "%BUN_INSTALL_DIR%\bun.exe" (
        SET "BUN_CMD=%BUN_INSTALL_DIR%\bun.exe"
        GOTO :bun_found
    )

    :: Auto-install Bun
    CALL :install_bun
    IF !ERRORLEVEL! NEQ 0 EXIT /B !ERRORLEVEL!

:bun_found
    ECHO Bun is installed at "!BUN_CMD!". %TO_NUL%
    EXIT /B 0

:install_bun
    :: Install Bun automatically
    ECHO Bun is not installed. Installing now... %TO_NUL%
    POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://bun.sh/install.ps1'))" %TO_NUL%
    IF ERRORLEVEL 1 (
        CALL :show_error "Failed to install Bun"
        EXIT /B 1
    )

    :: Verify installation
    IF EXIST "%BUN_INSTALL_DIR%\bun.exe" (
        SET "BUN_CMD=%BUN_INSTALL_DIR%\bun.exe"
        EXIT /B 0
    )

    CALL :show_error "Bun installation completed but executable was not found"
    EXIT /B 1

:: ===================================================================================
:: UTILITY FUNCTIONS
:: ===================================================================================

:is_file
    :: Check if the given path is a file
    :: Parameter: %1 - Path to check
    :: Returns: 0 if file exists, 1 otherwise
    IF EXIST "%~1" (
        EXIT /B 0
    )
    EXIT /B 1

:: ===================================================================================
:: UPDATE FUNCTIONS
:: ===================================================================================

:check_for_updates
    :: Check for updates from GitHub Pages
    :: Uses Bun for logic since it's cleaner than batch/powershell
    :: Stores state in %USERPROFILE%\.runcmd\state.json
    
    :: Skip if explicitly disabled
    IF "%RUNCMD_NO_UPDATE%"=="1" EXIT /B 0
    
    :: Ensure Bun is available (we need it for the update check script)
    :: But we don't want to fail if bun isn't there yet (chicken/egg)
    :: So we try to find it, if not, we skip update check until next run (when main will install it)
    IF NOT defined BUN_CMD (
        FOR /F "usebackq delims=" %%I IN (`where bun 2^>nul`) DO SET "BUN_CMD=%%~fI"
        IF NOT defined BUN_CMD IF EXIST "%BUN_INSTALL_DIR%\bun.exe" SET "BUN_CMD=%BUN_INSTALL_DIR%\bun.exe"
    )
    
    IF NOT defined BUN_CMD EXIT /B 0

    :: Run the update check logic in a temporary JS file
    SET "UPDATE_SCRIPT=%TEMP%\runcmd_update_check_%RANDOM%.js"
    
    (
    ECHO const fs = require^('fs'^);
    ECHO const path = require^('path'^);
    ECHO const os = require^('os'^);
    ECHO.
    ECHO const UPDATE_URL_BASE = 'https://lguzzon.github.io/runcmd';
    ECHO const RUNCMD_HOME = path.join^(os.homedir^(^), '.runcmd'^);
    ECHO const STATE_FILE = path.join^(RUNCMD_HOME, 'state.json'^);
    ECHO const CHECK_INTERVAL = 7 * 24 * 3600 * 1000; // 7 days in ms
    ECHO const CURRENT_SCRIPT = process.argv[2];
    ECHO.
    ECHO async function main^(^) {
    ECHO   try {
    ECHO     if ^(!fs.existsSync^(RUNCMD_HOME^)^) fs.mkdirSync^(RUNCMD_HOME, { recursive: true }^);
    ECHO.
    ECHO     let state = { last_check: 0, current_version: '0.0.0' };
    ECHO     try { state = JSON.parse^(fs.readFileSync^(STATE_FILE, 'utf8'^)^); } catch ^(e^) {}
    ECHO.
    ECHO     const now = Date.now^(^);
    ECHO     if ^(now - state.last_check ^< CHECK_INTERVAL^) return;
    ECHO.
    ECHO     console.error^('[INFO] Checking for updates...'^);
    ECHO     const res = await fetch^(UPDATE_URL_BASE + '/version.txt', { signal: AbortSignal.timeout(5000) }^);
    ECHO     if ^(!res.ok^) throw new Error^('Failed to fetch version'^);
    ECHO     const remoteVersion = ^(await res.text^(^)^).trim^(^);
    ECHO.
    ECHO     if ^(compareVersions^(state.current_version, remoteVersion^) ^>= 0^) {
    ECHO        console.error^('[INFO] Runcmd is up to date '^ + state.current_version^);
    ECHO        state.last_check = now;
    ECHO        fs.writeFileSync^(STATE_FILE, JSON.stringify^(state^)^);
    ECHO        return;
    ECHO     }
    ECHO.
    ECHO     console.error^('[INFO] New version available: ' + remoteVersion + '. Updating...'^);
    ECHO     const scriptRes = await fetch^(UPDATE_URL_BASE + '/runcmd.bat', { signal: AbortSignal.timeout(10000) }^);
    ECHO     if ^(!scriptRes.ok^) throw new Error^('Failed to fetch update'^);
    ECHO     const newContent = await scriptRes.text^(^);
    ECHO.
    ECHO     if ^(!newContent.includes^('runcmd.bat'^)^) throw new Error^('Invalid update content'^);
    ECHO.
    ECHO     // Write new content to a temporary file
    ECHO     const tempFile = CURRENT_SCRIPT + '.new';
    ECHO     fs.writeFileSync^(tempFile, newContent^);
    ECHO.
    ECHO     // Signal the batch script to update
    ECHO     console.log^('UPDATE_READY|' + tempFile + '|' + remoteVersion^);
    ECHO.
    ECHO     // Update state (assuming success)
    ECHO     state.current_version = remoteVersion;
    ECHO     state.last_check = now;
    ECHO     fs.writeFileSync^(STATE_FILE, JSON.stringify^(state^)^);
    ECHO.
    ECHO   } catch ^(e^) {
    ECHO     // console.error^('Update check failed:', e.message^);
    ECHO   }
    ECHO }
    ECHO.
    ECHO function compareVersions^(a, b^) {
    ECHO   if ^(a === b^) return 0;
    ECHO   const pa = a.split^('.'^).map^(Number^);
    ECHO   const pb = b.split^('.'^).map^(Number^);
    ECHO   for ^(let i = 0; i ^< 3; i++^) {
    ECHO     const na = pa[i] ^|^| 0;
    ECHO     const nb = pb[i] ^|^| 0;
    ECHO     if ^(na ^> nb^) return 1;
    ECHO     if ^(nb ^> na^) return -1;
    ECHO   }
    ECHO   return 0;
    ECHO }
    ECHO.
    ECHO main^(^);
    ) > "%UPDATE_SCRIPT%"

    :: Execute the update check script
    FOR /F "usebackq tokens=1,2,3 delims=|" %%A IN (`call !BUN_CMD! "%UPDATE_SCRIPT%" "%~f0"`) DO (
        IF "%%A"=="UPDATE_READY" (
            SET "NEW_SCRIPT=%%B"
            SET "NEW_VER=%%C"
            
            ECHO [INFO] Applying update to version !NEW_VER!...
            
            :: Self-update dance for Windows
            :: 1. Move current script to .old
            :: 2. Move new script to current
            :: 3. Schedule .old deletion (can be done next run or via separate process)
            
            MOVE /Y "%~f0" "%~f0.old" >nul
            MOVE /Y "!NEW_SCRIPT!" "%~f0" >nul
            
            ECHO [INFO] Update applied. Restarting...
            
            :: Restart the script with original arguments
            :: We use START /B to run in same window, but since we are restarting, 
            :: we probably want to just CALL the new script and exit this one.
            :: But since we renamed ourselves, we might be in a fragile state.
            
            :: Correct approach:
            :: The current batch file content is already read into memory by CMD mostly, but renaming it is safe.
            :: We can just continue, OR restart. 
            :: Restarting ensures we run the NEW code immediately.
            
            "%~f0" %*
            DEL "%UPDATE_SCRIPT%" >nul 2>&1
            EXIT /B
        )
    )
    
    :: Cleanup
    DEL "%UPDATE_SCRIPT%" >nul 2>&1
    
    :: Cleanup old backup if exists
    IF EXIST "%~f0.old" DEL "%~f0.old" >nul 2>&1
    
    EXIT /B 0

:show_error
    :: Display error message
    :: Parameter: %1 - Error message
    >&2 ECHO [ERROR] %~1
    EXIT /B 0