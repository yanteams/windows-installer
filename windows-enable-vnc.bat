@echo off
mode con cp select=437 >nul

rem Enable VNC Server trên Windows để có thể remote qua VNC
rem Sử dụng TightVNC Server (miễn phí, nhẹ, dễ cấu hình)

echo Enabling VNC Server for remote access...

rem Kiểm tra xem đã cài VNC chưa
reg query "HKLM\SOFTWARE\TightVNC" >nul 2>&1
if %errorlevel% == 0 (
    echo VNC Server already installed, configuring...
    goto :configure
)

rem Tải TightVNC Server
echo Downloading TightVNC Server...
set VNC_URL=https://www.tightvnc.com/download/2.8.85/tightvnc-2.8.85-gpl-setup-64bit.msi
set VNC_FILE=%TEMP%\tightvnc.msi

rem Sử dụng PowerShell để tải file
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%VNC_URL%' -OutFile '%VNC_FILE%'"

if not exist "%VNC_FILE%" (
    echo Failed to download VNC Server. You may need to install it manually.
    echo Please download from: https://www.tightvnc.com/download.php
    goto :del
)

rem Cài đặt TightVNC Server (silent mode)
echo Installing TightVNC Server...
msiexec /i "%VNC_FILE%" /quiet /norestart ADDLOCAL=Server SERVER_REGISTER_AS_SERVICE=1 SERVER_ADD_FIREWALL_EXCEPTION=1

rem Đợi cài đặt hoàn tất
timeout /t 10 /nobreak >nul

rem Kiểm tra xem đã cài thành công chưa
reg query "HKLM\SOFTWARE\TightVNC" >nul 2>&1
if %errorlevel% NEQ 0 (
    echo Failed to install VNC Server. Please install manually.
    goto :del
)

:configure
rem Cấu hình VNC Server
echo Configuring VNC Server...

rem Đặt password VNC (mặc định: sử dụng Administrator password)
rem Hoặc có thể set password riêng cho VNC
set VNC_PASSWORD=Admin123
set VNC_PORT=5900

rem Cấu hình VNC Server qua registry
reg add "HKLM\SOFTWARE\TightVNC\Server" /v RfbPort /t REG_DWORD /d %VNC_PORT% /f >nul 2>&1
reg add "HKLM\SOFTWARE\TightVNC\Server" /v QueryAcceptOnTimeout /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\TightVNC\Server" /v QueryTimeout /t REG_DWORD /d 10 /f >nul 2>&1

rem Mở firewall cho VNC
echo Opening firewall for VNC...
netsh advfirewall firewall delete rule name="TightVNC Server" >nul 2>&1
netsh advfirewall firewall add rule name="TightVNC Server" dir=in action=allow protocol=TCP localport=%VNC_PORT% >nul 2>&1

rem Khởi động VNC Server service
echo Starting VNC Server service...
net start "TightVNC Server" >nul 2>&1

rem Kiểm tra service đã chạy chưa
sc query "TightVNC Server" | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo VNC Server enabled successfully!
    echo - Port: %VNC_PORT%
    echo - Password: (Use Administrator password or set via VNC Server settings)
    echo You can now connect via VNC client to: your-server-ip:%VNC_PORT%
) else (
    echo Warning: VNC Server service may not be running properly.
    echo You may need to set VNC password manually via VNC Server settings.
)

rem Xóa file cài đặt
if exist "%VNC_FILE%" del "%VNC_FILE%"

:del
del "%~f0"
exit /b

