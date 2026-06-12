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
ENDLOCAL & SET "DEBUG=%OLD_DEBUG%" & EXIT /B !ERRORLEVEL!

:: ===================================================================================
:: INITIALIZATION FUNCTIONS
:: ===================================================================================

:initialize_environment
    :: Initialize environment variables and output redirection
    SET "OLD_DEBUG=%DEBUG%"
    
    :: Read version from version.txt for single source of truth
    :: Falls back to 1.0.0 if file is missing
    SET "RUNCMD_VERSION=1.0.0"
    IF EXIST "%~dp0version.txt" (
        FOR /F "usebackq delims=" %%V IN ("%~dp0version.txt") DO SET "RUNCMD_VERSION=%%V"
    )
    
    SET "TO_NUL= > nul 2> nul"
    SET "ECHO_TO_NUL= > nul 2> nul"
    EXIT /B 0

:parse_debug_mode_and_collect
    :: Parse debug mode arguments and collect remaining arguments
    :: Arguments: +d (basic), +dd (with file), +ddd (full echo), +d0 (disable)
    SET "_guard_debug_parse=1"
    REM Fall through to debug_parse_loop

:debug_parse_loop
    :: Guard against accidental CALL to internal loop label
    IF NOT defined _guard_debug_parse (
        CALL :show_error "Internal error: accidental CALL to :debug_parse_loop"
        EXIT /B 1
    )
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
        :: Guard for args_collect_loop - set before fall-through
        SET "_guard_args_collect=1"
        REM Fall through to args_collect_loop

    :args_collect_loop
        :: Guard against accidental CALL to internal loop label
        IF NOT defined _guard_args_collect (
            CALL :show_error "Internal error: accidental CALL to :args_collect_loop"
            EXIT /B 1
        )
        IF "%~1" == "" GOTO :args_collect_done
        SET "args_after_debug=!args_after_debug! %1"
        SHIFT
        GOTO :args_collect_loop
    :args_collect_done
        SET "_guard_debug_parse="
        SET "_guard_args_collect="
        EXIT /B 0

:configure_output_redirection
    :: Configure output redirection based on debug level
    :: Level 3: Full echo on, no redirection
    :: Level 2: No redirection for file operations
    :: Level 1: No redirection for echo output
    :: Level 0/empty: Full redirection for quiet operation
    ::
    :: NOTE: DEBUG semantics differ between platforms:
    ::   runcmd.bat uses 4 levels (+d, +dd, +ddd, +d0) with granular
    ::   control over ECHO and redirection behavior.
    ::   runcmd.sh uses a simpler on/off model (+debug or DEBUG=1).
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

    :: Handle --env/-e at main level for proper SHIFT scope
    IF /I "%~1" == "--env" (
        IF "%~2" == "" (
            CALL :show_error "--env option requires a file path"
            ECHO Usage: runcmd.bat --env /path/to/custom.env
            EXIT /B 1
        )
        CALL :load_env "%~2"
        SHIFT
        SHIFT
    ) ELSE IF /I "%~1" == "-e" (
        IF "%~2" == "" (
            CALL :show_error "--env option requires a file path"
            ECHO Usage: runcmd.bat --env /path/to/custom.env
            EXIT /B 1
        )
        CALL :load_env "%~2"
        SHIFT
        SHIFT
    )

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
            echo(!line!| >nul findstr /r "^[A-Za-z_][A-Za-z0-9_]*$"
            IF NOT ERRORLEVEL 1 (
                SET "!line!=!value!"
            )
        )
    )
    EXIT /B 0

:: ===================================================================================
:: ARGUMENT PROCESSING FUNCTIONS
:: ===================================================================================

:handle_special_options
    :: Handle special command line options (+e, +help, +version)
    SET "first_arg=%~1"
    SET "exit_please=0"

    :: Handle environment variable listing
    IF /I "%first_arg%" == "+e" (
        SET
        EXIT /B 99
    )

    :: Handle help
    IF /I "%first_arg%" == "+help" (
        CALL :show_help
        EXIT /B 99
    )
    IF /I "%first_arg%" == "+h" (
        CALL :show_help
        EXIT /B 99
    )

    :: Handle version
    IF /I "%first_arg%" == "+version" (
        ECHO runcmd v%RUNCMD_VERSION%
        EXIT /B 99
    )
    IF /I "%first_arg%" == "+v" (
        ECHO runcmd v%RUNCMD_VERSION%
        EXIT /B 99
    )

    EXIT /B 0

:process_main_arguments
    :: Process and collect main arguments for script execution
    :: Skips --env/-e (handled at main level with proper SHIFT scope)
    SET "_guard_process_args=1"
    SET "first_arg="
    SET "collected="
:process_args_loop
    :: Guard against accidental CALL
    IF NOT defined _guard_process_args (
        CALL :show_error "Internal error: accidental CALL to :process_args_loop"
        EXIT /B 1
    )
    IF "%~1" == "" GOTO :process_args_done
    IF /I "%~1" == "--env" SHIFT & SHIFT & GOTO :process_args_loop
    IF /I "%~1" == "-e" SHIFT & SHIFT & GOTO :process_args_loop
    IF NOT defined first_arg SET "first_arg=%~1"
    SET "collected=!collected! %1"
    SHIFT
    GOTO :process_args_loop
:process_args_done
    SET "_guard_process_args="
    SET "main_args=%collected%"
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
    CALL :collect_args %2 %3 %4 %5 %6 %7 %8 %9
    SET "remaining_args=%collected%"

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
    CALL :collect_args %2 %3 %4 %5 %6 %7 %8 %9
    SET "remaining_args=%collected%"

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

:collect_args
    :: Collect all arguments into %collected%
    :: Usage: CALL :collect_args [args...]
    SET "collected="
    SET "_guard_collect_args=1"
    REM Fall through to collect_args_loop

:collect_args_loop
    :: Guard against accidental CALL to internal loop label
    IF NOT defined _guard_collect_args (
        CALL :show_error "Internal error: accidental CALL to :collect_args_loop"
        EXIT /B 1
    )
    IF "%~1" == "" GOTO :collect_args_done
    SET "collected=!collected! %1"
    SHIFT
    GOTO :collect_args_loop
    :collect_args_done
    SET "_guard_collect_args="
    EXIT /B 0

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

    :: Run the update check script
    FOR /F "usebackq tokens=1,2,3 delims=|" %%A IN (`call !BUN_CMD! "%~dp0runcmd-update.js" "%~f0" "%RUNCMD_VERSION%"`) DO (
        IF "%%A"=="UPDATE_READY" (
            SET "NEW_SCRIPT=%%B"
            SET "NEW_VER=%%C"

            ECHO [INFO] Applying update to version !NEW_VER!...

            MOVE /Y "%~f0" "%~f0.old" >nul
            MOVE /Y "!NEW_SCRIPT!" "%~f0" >nul

            ECHO [INFO] Update applied. Restarting...

            "%~f0" %*
            EXIT /B
        )
    )

    :: Cleanup old backup if exists
    IF EXIST "%~f0.old" DEL "%~f0.old" %TO_NUL%

    EXIT /B 0

:show_help
    :: Display help message
    ECHO runcmd v%RUNCMD_VERSION%
    ECHO.
    ECHO Usage: runcmd.bat [options] [arguments]
    ECHO.
    ECHO A universal script runner for JavaScript, TypeScript, and Python files.
    ECHO.
    ECHO OPTIONS:
    ECHO   +d, +dd, +ddd, +d0
    ECHO       Set debug level (basic, with file ops, full echo, disable)
    ECHO.
    ECHO   +e
    ECHO       List all environment variables
    ECHO.
    ECHO   +h, +help
    ECHO       Display this help message and exit
    ECHO.
    ECHO   +v, +version
    ECHO       Display version information and exit
    ECHO.
    ECHO   --env ^<file^>
    ECHO       Load environment variables from a custom file
    ECHO.
    ECHO ARGUMENTS:
    ECHO   Any remaining arguments are passed directly to the target script
    ECHO.
    ECHO EXAMPLES:
    ECHO   runcmd.bat +d                    # Run with debug logging
    ECHO   runcmd.bat +e                    # List environment variables
    ECHO   runcmd.bat --env custom.env      # Load custom environment file
    ECHO   runcmd.bat +v                    # Show version
    ECHO.
    EXIT /B 0

:show_error
    :: Display error message
    :: Parameter: %1 - Error message
    >&2 ECHO [ERROR] %~1
    EXIT /B 0