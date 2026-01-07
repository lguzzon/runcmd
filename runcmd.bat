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

:show_error
    :: Display error message
    :: Parameter: %1 - Error message
    >&2 ECHO [ERROR] %~1
    EXIT /B 0